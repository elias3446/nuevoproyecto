from django.contrib import admin
from .models import Permission, Role, RolePermission, UserRole, UserResourcePermission


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['action', 'description', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['action', 'description']
    ordering = ['category', 'action']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'is_system', 'created_at', 'updated_at']
    list_filter = ['is_system']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'granted_at']
    list_filter = ['role', 'permission__category']
    search_fields = ['role__name', 'permission__action']
    ordering = ['role__name', 'permission__category']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'assigned_at', 'assigned_by']
    list_filter = ['role']
    search_fields = ['user__email', 'role__name']
    ordering = ['-assigned_at']


@admin.register(UserResourcePermission)
class UserResourcePermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'permission', 'resource_type', 'resource_id', 'granted_at', 'expires_at']
    list_filter = ['resource_type', 'permission__category']
    search_fields = ['user__email', 'permission__action']
    ordering = ['-granted_at']
    date_hierarchy = 'granted_at'