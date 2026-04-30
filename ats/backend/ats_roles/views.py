from rest_framework import viewsets, generics, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Permission, Role, UserRole
from .serializers import PermissionSerializer, RoleSerializer, UserRoleSerializer
from .permissions import HasPermission
from .ui_config import UI_MENU_STRUCTURE
from audit.models import AuditLog, AuditAction
from rest_framework.views import APIView

class UIConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .services import PermissionService
        
        user_permissions = PermissionService.get_user_permissions(request.user)
        is_admin = request.user.is_superuser or request.user.user_roles.filter(role__name__in=['Administrador', 'Superadministrador']).exists()
        
        filtered_menu = []
        for item in UI_MENU_STRUCTURE:
            req_perm = item.get('required_permission')
            if not req_perm or is_admin or req_perm in user_permissions:
                filtered_menu.append(item)
        
        return Response({
            "menu": filtered_menu,
            "theme_config": {
                "primary_color": "#3b82f6", # Ejemplo de config por tenant futura
                "company_name": "ATS Platform"
            }
        })

class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.all().order_by('category', 'action')
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated] # Solo lectura para autenticados
    pagination_class = None


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
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

    def perform_destroy(self, instance):
        if instance.is_system:
            return Response(
                {"error": "No se pueden eliminar roles del sistema"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_values = RoleSerializer(instance).data
        role_id = instance.id
        instance.delete()
        # Auditoría
        self._log_audit_manual(role_id, 'Role', AuditAction.DELETE, old_values=old_values)

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
