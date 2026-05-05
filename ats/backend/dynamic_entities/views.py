from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import models
from .models import EntityDefinition, FieldDefinition, DynamicData
from .serializers import EntityDefinitionSerializer, FieldDefinitionSerializer, DynamicDataSerializer

class EntityDefinitionViewSet(viewsets.ModelViewSet):
    # Atributo necesario para que el router autodetecte el basename
    queryset = EntityDefinition.objects.all()
    serializer_class = EntityDefinitionSerializer

    def get_queryset(self):
        # El SchemaRouter redirigirá esto a roles_db automáticamente
        return EntityDefinition.objects.all()

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        
        instance = EntityDefinition.objects.filter(models.Q(id=pk) | models.Q(module_id=pk)).first()
        
        if not instance:
            from ats_roles.models import Module
            module = Module.objects.filter(id=pk).first()
            if module:
                instance = EntityDefinition.objects.create(
                    module=module,
                    name=module.name,
                    label=module.label
                )
            else:
                from django.http import Http404
                raise Http404("No se encontró el módulo o la entidad")
                
        self.check_object_permissions(self.request, instance)
        return instance

    @action(detail=True, methods=['post'])
    def sync_fields(self, request, pk=None):
        entity = self.get_object()
        fields_data = request.data.get('fields', [])
        
        entity.fields.all().delete()
        
        created_fields = []
        for f_data in fields_data:
            serializer = FieldDefinitionSerializer(data=f_data)
            if serializer.is_valid():
                serializer.save(entity=entity)
                created_fields.append(serializer.data)
        
        return Response(created_fields, status=status.HTTP_201_CREATED)

class DynamicDataViewSet(viewsets.ModelViewSet):
    # Atributo necesario para que el router autodetecte el basename
    queryset = DynamicData.objects.all()
    serializer_class = DynamicDataSerializer

    def get_queryset(self):
        entity_id = self.request.query_params.get('entity_id')
        if entity_id:
            return self.queryset.filter(models.Q(entity_id=entity_id) | models.Q(entity__module_id=entity_id))
        return self.queryset

    def perform_create(self, serializer):
        entity_id = self.request.data.get('entity')
        if entity_id:
            entity = EntityDefinition.objects.filter(models.Q(id=entity_id) | models.Q(module_id=entity_id)).first()
            if entity:
                serializer.save(entity=entity, created_by=str(self.request.user))
                return
        serializer.save(created_by=str(self.request.user))
