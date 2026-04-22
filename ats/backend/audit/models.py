import uuid
from django.db import models
from django.conf import settings


class AuditAction(models.TextChoices):
    INSERT = 'INSERT', 'Crear'
    UPDATE = 'UPDATE', 'Actualizar'
    DELETE = 'DELETE', 'Eliminar'
    LOGIN = 'LOGIN', 'Iniciar Sesión'
    LOGOUT = 'LOGOUT', 'Cerrar Sesión'
    EXPORT = 'EXPORT', 'Exportar'


class ExportFormat(models.TextChoices):
    CSV = 'csv', 'CSV'
    XLSX = 'xlsx', 'Excel'
    PDF = 'pdf', 'PDF'
    JSON = 'json', 'JSON'


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    session_id = models.UUIDField(null=True, blank=True, help_text="ID de sesión de auth")
    action = models.CharField(max_length=20, choices=AuditAction.choices)
    table_name = models.CharField(max_length=100)
    record_id = models.UUIDField()
    old_values = models.JSONField(blank=True, null=True)
    new_values = models.JSONField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'logs'
        verbose_name = 'Log de Auditoría'
        verbose_name_plural = 'Logs de Auditoría'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['table_name', 'record_id']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.action} on {self.table_name} by {self.user}"


class AccessLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='access_logs'
    )
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'access_logs'
        verbose_name = 'Log de Acceso'
        verbose_name_plural = 'Logs de Acceso'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.action} - {self.reason or 'N/A'}"


class Export(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='exports'
    )
    export_type = models.CharField(max_length=50)
    filters = models.JSONField(default=dict, blank=True)
    format = models.CharField(max_length=10, choices=ExportFormat.choices)
    record_count = models.PositiveIntegerField(default=0)
    file_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exports'
        verbose_name = 'Exportación'
        verbose_name_plural = 'Exportaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.export_type} - {self.format} ({self.record_count} registros)"