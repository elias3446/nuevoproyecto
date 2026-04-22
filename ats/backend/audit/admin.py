from django.contrib import admin
from .models import AuditLog, AccessLog, Export


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'table_name', 'record_id', 'created_at']
    list_filter = ['action', 'table_name']
    search_fields = ['user__email', 'table_name']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    readonly_fields = ['user', 'session_id', 'action', 'table_name', 'record_id', 
                       'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at']


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'reason', 'created_at']
    list_filter = ['action', 'resource_type']
    search_fields = ['user__email', 'action', 'reason']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 
                       'ip_address', 'user_agent', 'reason', 'created_at']


@admin.register(Export)
class ExportAdmin(admin.ModelAdmin):
    list_display = ['user', 'export_type', 'format', 'record_count', 'created_at']
    list_filter = ['export_type', 'format']
    search_fields = ['user__email', 'export_type']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    readonly_fields = ['user', 'export_type', 'filters', 'format', 'record_count', 
                       'file_url', 'created_at']