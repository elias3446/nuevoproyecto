import uuid
from django.db import models
from django.conf import settings


class StorageBucket(models.Model):
    """
    Mapea a storage.buckets (managed=False)
    """
    id = models.TextField(primary_key=True)
    name = models.TextField(unique=True)
    owner = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    public = models.BooleanField(default=False)
    avif_autodetection = models.BooleanField(default=False)
    file_size_limit = models.BigIntegerField(null=True, blank=True)
    allowed_mime_types = models.TextField(null=True, blank=True)
    owner_id = models.TextField(null=True, blank=True)
    type = models.TextField(default='STANDARD')

    class Meta:
        db_table = '"storage"."buckets"'
        managed = False
        verbose_name = 'Storage Bucket'
        verbose_name_plural = 'Storage Buckets'

    def __str__(self):
        return self.name


class StorageObject(models.Model):
    """
    Mapea a storage.objects (managed=False)
    Almacena metadatos de archivos subidos.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bucket_id = models.TextField()
    name = models.TextField()
    owner = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)
    version = models.TextField(null=True, blank=True)
    owner_id = models.TextField(null=True, blank=True)
    user_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = '"storage"."objects"'
        managed = False
        verbose_name = 'Storage Object'
        verbose_name_plural = 'Storage Objects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bucket_id']),
            models.Index(fields=['owner_id']),
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.bucket_id})"

    @property
    def file_size(self):
        if self.metadata:
            return self.metadata.get('size', 0)
        return 0

    @property
    def mime_type(self):
        if self.metadata:
            return self.metadata.get('mimetype', 'application/octet-stream')
        return 'application/octet-stream'

    @property
    def file_name(self):
        if self.name:
            return self.name.split('/')[-1]
        return ''


class AsyncUpload(models.Model):
    """
    Control de subidas asíncronas vía Redis/Celery.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('PROCESSING', 'Procesando'),
        ('COMPLETED', 'Completado'),
        ('FAILED', 'Fallido'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    original_name = models.TextField()
    bucket_id = models.TextField(default='user-files')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    task_id = models.CharField(max_length=255, null=True, blank=True)
    temp_redis_key = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'async_uploads'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.original_name} - {self.status}"
