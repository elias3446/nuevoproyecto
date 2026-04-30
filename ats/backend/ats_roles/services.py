import logging
from django.core.cache import cache
from django.conf import settings
from .models import RolePermission, UserRole, UserResourcePermission, Permission

logger = logging.getLogger(__name__)

class PermissionService:
    CACHE_KEY_PREFIX = "user_permissions:"
    CACHE_TIMEOUT = 600  # 10 minutos

    @classmethod
    def _get_cache_key(cls, user_id):
        return f"{cls.CACHE_KEY_PREFIX}{user_id}"

    @classmethod
    def get_user_permissions(cls, user):
        """
        Obtiene todos los permisos (acciones) asignados a un usuario,
        utilizando caché en Redis para optimizar el rendimiento.
        """
        if user.is_anonymous:
            return set()
        
        if user.is_superuser:
            # Superusuarios tienen todas las acciones posibles
            return set(Permission.objects.values_list('action', flat=True))

        cache_key = cls._get_cache_key(user.id)
        permissions = cache.get(cache_key)

        if permissions is None:
            # 1. Permisos globales vía Roles
            global_perms = Permission.objects.filter(
                role_permissions__role__user_roles__user=user
            ).values_list('action', flat=True)
            
            permissions = set(global_perms)
            
            # Guardar en caché
            cache.set(cache_key, permissions, cls.CACHE_TIMEOUT)
            logger.debug(f"Cache miss for user {user.id}. Permissions cached.")
        
        return permissions

    @classmethod
    def has_permission(cls, user, action, resource_type=None, resource_id=None):
        """
        Verifica si un usuario tiene un permiso específico.
        Soporta verificación global y a nivel de recurso.
        """
        if user.is_anonymous:
            return False
        
        if user.is_superuser:
            return True

        # 1. Verificar permiso global (vía caché)
        user_perms = cls.get_user_permissions(user)
        if action in user_perms:
            return True

        # 2. Verificar permiso específico de recurso (ACL)
        if resource_type and resource_id:
            return UserResourcePermission.objects.filter(
                user=user,
                permission__action=action,
                resource_type=resource_type,
                resource_id=resource_id
            ).exists()

        return False

    @classmethod
    def invalidate_user_cache(cls, user_id):
        """Invalida la caché de permisos de un usuario."""
        cache_key = cls._get_cache_key(user_id)
        cache.delete(cache_key)
        logger.info(f"Invalidated permission cache for user {user_id}")

    @classmethod
    def invalidate_all_caches(cls):
        """
        Invalida todas las cachés de permisos. 
        Útil cuando se modifican los permisos de un Rol.
        """
        # Nota: En producción con muchos usuarios, esto podría ser costoso.
        # Una alternativa es usar un versionado de caché global.
        cache.delete_pattern(f"{cls.CACHE_KEY_PREFIX}*")
        logger.info("Invalidated all permission caches")
