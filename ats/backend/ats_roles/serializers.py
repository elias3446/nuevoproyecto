from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Permission, Role, RolePermission, UserRole, UserResourcePermission, Module
from .services import PermissionService

User = get_user_model()

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ['id', 'name', 'label', 'icon', 'route', 'order', 'is_active', 'is_system']


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'action', 'description', 'category', 'module', 'is_system']
        read_only_fields = ['id', 'is_system']


class RolePermissionSerializer(serializers.ModelSerializer):
    permission_detail = PermissionSerializer(source='permission', read_only=True)
    
    class Meta:
        model = RolePermission
        fields = ['permission', 'permission_detail', 'granted_at']


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    permission_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        write_only=True, 
        required=False
    )

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'description', 'is_system', 
            'permissions', 'permission_ids', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_system', 'created_at', 'updated_at']

    def get_permissions(self, obj):
        return list(Permission.objects.filter(role_permissions__role=obj).values_list('action', flat=True))

    def create(self, validated_data):
        # Permitir crear por IDs o por nombres de acción
        permission_ids = validated_data.pop('permission_ids', [])
        permission_actions = self.initial_data.get('permissions', [])
        
        role = Role.objects.create(**validated_data)
        
        # Priorizar acciones si vienen (formato amigable para el frontend)
        if permission_actions:
            perms = Permission.objects.filter(action__in=permission_actions)
            for p in perms:
                RolePermission.objects.create(role=role, permission=p)
        else:
            for p_id in permission_ids:
                RolePermission.objects.create(role=role, permission_id=p_id)
        
        return role

    def update(self, instance, validated_data):
        if instance.is_system:
            validated_data.pop('name', None)

        permission_ids = validated_data.pop('permission_ids', None)
        permission_actions = self.initial_data.get('permissions', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Actualizar permisos (priorizar acciones)
        if permission_actions is not None or permission_ids is not None:
            instance.role_permissions.all().delete()
            
            if permission_actions is not None:
                perms = Permission.objects.filter(action__in=permission_actions)
                for p in perms:
                    RolePermission.objects.create(role=instance, permission=p)
            elif permission_ids is not None:
                for p_id in permission_ids:
                    RolePermission.objects.create(role=instance, permission_id=p_id)
            
            PermissionService.invalidate_all_caches()

        return instance


class UserRoleSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True)

    class Meta:
        model = UserRole
        fields = ['id', 'user', 'user_email', 'role', 'role_name', 'assigned_at', 'assigned_by_email']
        read_only_fields = ['id', 'assigned_at', 'assigned_by_email']

    def create(self, validated_data):
        user_role = super().create(validated_data)
        # Invalidar caché del usuario específico
        PermissionService.invalidate_user_cache(user_role.user.id)
        return user_role
