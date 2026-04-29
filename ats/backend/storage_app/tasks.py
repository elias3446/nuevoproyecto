from celery import shared_task
from django.core.files.storage import default_storage
from django.core.cache import cache
from django.core.files.base import ContentFile
from .models import AsyncUpload, StorageObject, StorageBucket
from audit.models import AuditLog
import logging
import os

logger = logging.getLogger(__name__)

@shared_task(name='process_file_upload_task', bind=True, max_retries=3)
def process_file_upload_task(self, upload_id):
    """
    Procesa la subida diferida de un archivo.
    1. Recupera el archivo de Redis.
    2. Sube al storage final.
    3. Crea el registro en storage.objects.
    """
    try:
        upload = AsyncUpload.objects.get(id=upload_id)
        upload.status = 'PROCESSING'
        upload.save()

        # 1. Recuperar el archivo de Redis
        file_content = cache.get(upload.temp_redis_key)
        if not file_content:
            raise ValueError("El archivo temporal ya no existe en Redis (posible expiración).")

        # 2. Preparar el almacenamiento final
        bucket_name = f"user_{upload.user.id}"
        # Asegurar bucket (aunque la vista ya lo hace, por seguridad)
        bucket, _ = StorageBucket.objects.get_or_create(
            name=bucket_name,
            defaults={'id': bucket_name, 'owner_id': str(upload.user.id), 'public': False}
        )

        file_path = f"{bucket_name}/{upload.original_name}"
        
        # 3. Subida definitiva
        content_file = ContentFile(file_content, name=upload.original_name)
        saved_path = default_storage.save(file_path, content_file)

        # 4. Crear registro StorageObject (managed=False)
        storage_obj = StorageObject.objects.create(
            bucket_id=bucket.id,
            name=saved_path,
            owner_id=str(upload.user.id),
            metadata={
                'size': len(file_content),
                'mimetype': upload.metadata.get('mimetype', 'application/octet-stream'),
                'original_name': upload.original_name,
                'async_upload_id': str(upload_id)
            },
            user_metadata=upload.metadata.get('user_metadata', {})
        )

        # 5. Auditar
        AuditLog.objects.create(
            user=upload.user,
            action='INSERT',
            table_name='storage.objects',
            record_id=storage_obj.id,
            new_values={'name': saved_path, 'size': len(file_content), 'async': True},
        )

        # 6. Actualizar estado y limpiar
        upload.status = 'COMPLETED'
        upload.metadata['storage_object_id'] = str(storage_obj.id)
        upload.save()
        
        # Limpiar Redis
        cache.delete(upload.temp_redis_key)
        
        logger.info(f"Subida asíncrona completada: {upload_id}")
        return str(storage_obj.id)

    except Exception as e:
        logger.error(f"Error procesando subida asíncrona {upload_id}: {str(e)}")
        
        try:
            upload = AsyncUpload.objects.get(id=upload_id)
            upload.status = 'FAILED'
            upload.error_message = str(e)
            upload.save()
        except Exception:
            pass
            
        # Reintentar si es un error temporal
        raise self.retry(exc=e, countdown=60)
