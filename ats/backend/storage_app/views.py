from rest_framework import generics, views, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
import os
from .models import StorageObject, StorageBucket, AsyncUpload
from .serializers import (
    FileSerializer, FileUploadSerializer, StorageBucketSerializer, 
    AsyncUploadSerializer
)
from audit.models import AuditLog
from datetime import timedelta
from django.core.cache import cache
import uuid


class UserStorageBucketView(generics.RetrieveAPIView):
    """
    Obtiene o crea el bucket personal del usuario.
    Bucket naming: "user_{user_id}"
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user_id = str(self.request.user.id)
        bucket_name = f"user_{user_id}"
        
        bucket, created = StorageBucket.objects.get_or_create(
            name=bucket_name,
            defaults={
                'id': bucket_name,
                'owner_id': user_id,
                'public': False,
                'type': 'STANDARD'
            }
        )
        return bucket

    def retrieve(self, request, *args, **kwargs):
        bucket = self.get_object()
        serializer = StorageBucketSerializer(bucket)
        return Response(serializer.data)


class FileUploadView(views.APIView):
    """
    POST: Subir un archivo.
    - Valida tamaño y tipo
    - Almacena en el bucket del usuario
    - Crea registro en storage.objects
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FileUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file_obj = serializer.validated_data['file']
        user_meta = serializer.validated_data.get('metadata', {})
        user_id = str(request.user.id)
        
        # 1. Almacenar temporalmente en Redis (Capa de persistencia rápida requested)
        # Nota: Generamos una llave única para el archivo en Redis
        temp_id = str(uuid.uuid4())
        redis_key = f"temp_upload:{user_id}:{temp_id}"
        
        # Leer contenido y guardar en Redis (expira en 1 hora por seguridad)
        file_content = file_obj.read()
        cache.set(redis_key, file_content, timeout=3600)

        # 2. Crear registro de control de subida asíncrona
        async_upload = AsyncUpload.objects.create(
            user=request.user,
            original_name=file_obj.name,
            temp_redis_key=redis_key,
            metadata={
                'mimetype': file_obj.content_type or 'application/octet-stream',
                'user_metadata': user_meta,
                'size': len(file_content)
            }
        )

        # 3. Disparar tarea de Celery
        from .tasks import process_file_upload_task
        task = process_file_upload_task.delay(str(async_upload.id))
        
        async_upload.task_id = task.id
        async_upload.save()

        return Response({
            "message": "Subida iniciada asíncronamente",
            "upload_id": async_upload.id,
            "status": async_upload.status
        }, status=status.HTTP_202_ACCEPTED)


class UserFileListView(generics.ListAPIView):
    """
    GET: Lista archivos del usuario autenticado.
    Filtrado automático por owner_id = user.id
    """
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = str(self.request.user.id)
        return StorageObject.objects.filter(
            owner_id=user_id
        ).select_related('bucket').order_by('-created_at')


class FileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Ver detalles y obtener URL de descarga firmada
    PATCH: Actualizar metadatos
    DELETE: Eliminar archivo (del storage y de la BD)
    """
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = str(self.request.user.id)
        return StorageObject.objects.filter(owner_id=user_id)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Generar URL firmada para descarga
        try:
            # URL firmada válida por 1 hora
            download_url = default_storage.url(instance.name)
        except Exception:
            download_url = None

        serializer = self.get_serializer(instance)
        data = serializer.data
        data['download_url'] = download_url
        return Response(data)

    def perform_destroy(self, instance):
        # Eliminar archivo del storage backend
        try:
            if default_storage.exists(instance.name):
                default_storage.delete(instance.name)
        except Exception:
            pass  # Loggear pero continuar

        # Auditar eliminación
        AuditLog.objects.create(
            user=self.request.user,
            action='DELETE',
            table_name='storage.objects',
            record_id=instance.id,
            old_values={'name': instance.name},
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )

        instance.delete()


class AsyncUploadStatusView(generics.RetrieveAPIView):
    """
    GET: Consulta el estado de una subida asíncrona.
    """
    queryset = AsyncUpload.objects.all()
    serializer_class = AsyncUploadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AsyncUpload.objects.filter(user=self.request.user)
