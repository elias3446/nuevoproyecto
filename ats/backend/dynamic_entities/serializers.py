from rest_framework import serializers
from .models import EntityDefinition, FieldDefinition, DynamicData

class FieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldDefinition
        fields = ['id', 'name', 'label', 'field_type', 'is_required', 'options', 'order']

class EntityDefinitionSerializer(serializers.ModelSerializer):
    fields = FieldDefinitionSerializer(many=True, read_only=True)
    module_label = serializers.CharField(source='module.label', read_only=True)

    class Meta:
        model = EntityDefinition
        fields = ['id', 'name', 'label', 'module', 'module_label', 'fields', 'is_active', 'created_at']

class DynamicDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicData
        fields = ['id', 'entity', 'data', 'created_at', 'updated_at', 'created_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def validate(self, attrs):
        # Aquí podríamos añadir validación dinámica basada en FieldDefinition
        # Por ahora permitimos el JSON libre, pero en el futuro validaremos
        # que cada campo en 'data' exista en el esquema.
        return attrs
