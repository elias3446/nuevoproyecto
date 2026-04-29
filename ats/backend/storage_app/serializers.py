from rest_framework import serializers
from django.conf import settings
from .models import StorageObject, StorageBucket


class StorageBucketSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageBucket
        fields = ['id', 'name', 'public', 'file_size_limit', 'type', 'created_at']
        read_only_fields = ['id', 'created_at']


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    bucket_id = serializers.CharField(required=False, default='user-files')
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_file(self, value):
        max_size = getattr(settings, 'MAX_UPLOAD_SIZE', 50 * 1024 * 1024)
        if value.size > max_size:
            raise serializers.ValidationError(
                f"Archivo excede el tamaño máximo de {max_size // (1024*1024)}MB"
            )
        return value


class FileSerializer(serializers.ModelSerializer):
    file_name = serializers.ReadOnlyField()
    file_size = serializers.ReadOnlyField()
    mime_type = serializers.ReadOnlyField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = StorageObject
        fields = [
            'id', 'bucket_id', 'name', 'file_name', 'file_size',
            'mime_type', 'metadata', 'user_metadata', 'created_at',
            'updated_at', 'download_url'
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        try:
            from django.core.files.storage import default_storage
            return default_storage.url(obj.name)
        except Exception:
            return None


class FileUpdateSerializer(serializers.ModelSerializer):
    user_metadata = serializers.JSONField(required=False)

    class Meta:
        model = StorageObject
        fields = ['user_metadata']


class AsyncUploadSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import AsyncUpload
        model = AsyncUpload
        fields = '__all__'
        read_only_fields = ['id', 'status', 'task_id', 'created_at', 'updated_at', 'error_message']
