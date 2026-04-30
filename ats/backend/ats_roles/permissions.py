from rest_framework import permissions
from .services import PermissionService

class HasPermission(permissions.BasePermission):
    """
    Permiso personalizado para DRF que verifica si el usuario tiene una acción específica.
    Uso:
        permission_classes = [HasPermission('job:create')]
    """
    def __init__(self, required_permission=None):
        self.required_permission = required_permission

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Si la vista tiene una acción definida (vía un atributo o método)
        action = self.required_permission or getattr(view, 'permission_action', None)
        
        if not action:
            # Si no se especifica acción, se asume que solo la autenticación es suficiente
            # o que la vista manejará la lógica internamente.
            return True

        return PermissionService.has_permission(request.user, action)

    def has_object_permission(self, request, view, obj):
        """
        Verificación granular a nivel de objeto.
        """
        if not request.user or not request.user.is_authenticated:
            return False

        action = self.required_permission or getattr(view, 'permission_action', None)
        if not action:
            return True

        # Intentar determinar el resource_type basado en el modelo del objeto
        resource_type = obj._meta.model_name
        
        return PermissionService.has_permission(
            request.user, 
            action, 
            resource_type=resource_type, 
            resource_id=obj.id
        )
