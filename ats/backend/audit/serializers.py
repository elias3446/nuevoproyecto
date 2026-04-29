from rest_framework import serializers
from .models import Export

class ExportSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)

    class Meta:
        model = Export
        fields = [
            'id', 'export_type', 'filters', 'format', 
            'status', 'status_display', 'format_display',
            'task_id', 'record_count', 'file_url', 
            'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'task_id', 'record_count', 
            'file_url', 'error_message', 'created_at', 'updated_at'
        ]

class ExportRequestSerializer(serializers.Serializer):
    export_type = serializers.ChoiceField(choices=[
        ('AUDIT_LOGS', 'Logs de Auditoría'),
        ('ACCESS_LOGS', 'Logs de Acceso'),
        # Podemos añadir más tipos aquí como 'CANDIDATES', 'JOBS', etc.
    ])
    format = serializers.ChoiceField(choices=[
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ])
    filters = serializers.JSONField(required=False, default=dict)
