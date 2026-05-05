from rest_framework import viewsets, generics, status, permissions, filters
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Permission, Role, UserRole, Module
from .serializers import PermissionSerializer, RoleSerializer, UserRoleSerializer, ModuleSerializer
from .permissions import HasPermission
from .ui_config import UI_MENU_STRUCTURE
from audit.models import AuditLog, AuditAction
from rest_framework.views import APIView
from ats.mixins import CachedListMixin

class UIConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .services import PermissionService
        
        user_permissions = PermissionService.get_user_permissions(request.user)
        is_admin = request.user.is_superuser or request.user.user_roles.filter(role__name__in=['Administrador', 'Superadministrador']).exists()
        
        # Obtener módulos activos desde la DB
        modules = Module.objects.filter(is_active=True).prefetch_related('permissions')
        
        filtered_menu = []
        for mod in modules:
            # Un módulo se muestra si no tiene permiso requerido, 
            # si el usuario es admin, o si tiene el permiso asociado.
            # Nota: Usamos el primer permiso del módulo como "permiso de acceso" 
            # o podrías añadir un campo required_permission al modelo Module.
            # Por ahora, si el módulo tiene permisos asociados, pedimos el primero de tipo 'read'
            
            read_perm = mod.permissions.filter(action__contains=':read').first()
            req_perm = read_perm.action if read_perm else None
            
            if not req_perm or is_admin or req_perm in user_permissions:
                filtered_menu.append({
                    "id": mod.name,
                    "label": mod.label,
                    "icon": mod.icon,
                    "route": mod.route,
                    "required_permission": req_perm
                })
        
        return Response({
            "menu": filtered_menu,
            "theme_config": {
                "primary_color": "#3b82f6",
                "company_name": "ATS Platform"
            }
        })


class ModuleViewSet(CachedListMixin, viewsets.ModelViewSet):
    queryset = Module.objects.all().order_by('order')
    serializer_class = ModuleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'label', 'route']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [HasPermission('user:manage_roles')()]

    def list(self, request, *args, **kwargs):
        if request.query_params.get('all') == 'true':
            self.pagination_class = None
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"error": "No se pueden eliminar módulos del sistema"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            if 'name' in request.data and request.data['name'] != instance.name:
                return Response(
                    {"error": "No se puede cambiar el nombre de un módulo del sistema"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)


class PermissionViewSet(CachedListMixin, viewsets.ModelViewSet):
    queryset = Permission.objects.all().order_by('category', 'action')
    serializer_class = PermissionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['action', 'description', 'category']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [HasPermission('user:manage_roles')()]

    def list(self, request, *args, **kwargs):
        if request.query_params.get('all') == 'true':
            self.pagination_class = None
        return super().list(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"error": "No se pueden eliminar permisos del sistema"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            if 'action' in request.data and request.data['action'] != instance.action:
                return Response(
                    {"error": "No se puede cambiar la acción de un permiso del sistema"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        return super().update(request, *args, **kwargs)


class RoleViewSet(CachedListMixin, viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    # La paginación está habilitada por defecto globalmente, 
    # pero aquí nos aseguramos de que no esté desactivada.
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [HasPermission('user:manage_roles')()]

    def perform_create(self, serializer):
        role = serializer.save()
        # Auditoría
        self._log_audit(role, AuditAction.INSERT, new_values=serializer.data)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_values = RoleSerializer(old_instance).data
        role = serializer.save()
        # Auditoría
        self._log_audit(role, AuditAction.UPDATE, old_values=old_values, new_values=serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {"error": "No se pueden eliminar roles del sistema"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_values = RoleSerializer(instance).data
        role_id = instance.id
        response = super().destroy(request, *args, **kwargs)
        # Auditoría manual tras destrucción exitosa
        self._log_audit_manual(role_id, 'Role', AuditAction.DELETE, old_values=old_values)
        return response

    def perform_destroy(self, instance):
        # Este ya no es el lugar principal de bloqueo, pero lo mantenemos por seguridad interna
        if not instance.is_system:
            instance.delete()

    def _log_audit(self, obj, action, old_values=None, new_values=None):
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            table_name='roles',
            record_id=obj.id,
            old_values=old_values,
            new_values=new_values,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )

    def _log_audit_manual(self, obj_id, table, action, old_values=None):
        AuditLog.objects.create(
            user=self.request.user,
            action=action,
            table_name=table,
            record_id=obj_id,
            old_values=old_values,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )


class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [HasPermission('user:manage_roles')]

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return self.queryset.filter(user_id=user_id)
        return self.queryset

    def perform_create(self, serializer):
        user_role = serializer.save(assigned_by=self.request.user)
        # Auditoría
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditAction.INSERT,
            table_name='user_roles',
            record_id=user_role.id,
            new_values=serializer.data,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
