from django.test import TestCase
from django.contrib.auth import get_user_model
from ats_roles.models import Role, Permission, RolePermission, UserRole, PermissionAction, PermissionCategory
import uuid

User = get_user_model()

class AtsRolesModelTests(TestCase):
    def setUp(self):
        self.user, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults={"password": "password123"}
        )
        # El permiso ya es creado por la migración 0001_initial
        self.permission = Permission.objects.get(action=PermissionAction.JOB_CREATE)
        
        # Usamos un rol nuevo que no esté en las migraciones para que empiece vacío
        self.role = Role.objects.create(
            name="Test Role",
            description="Rol para pruebas"
        )

    def test_permission_creation(self):
        """Verifica la creación de permisos."""
        self.assertEqual(self.permission.action, PermissionAction.JOB_CREATE)
        self.assertEqual(str(self.permission), PermissionAction.JOB_CREATE)

    def test_role_permission_assignment(self):
        """Verifica la asignación de permisos a un rol."""
        rp = RolePermission.objects.create(
            role=self.role,
            permission=self.permission
        )
        self.assertEqual(self.role.role_permissions.count(), 1)
        self.assertEqual(self.role.role_permissions.first().permission, self.permission)

    def test_user_role_assignment(self):
        """Verifica la asignación de roles a un usuario."""
        ur = UserRole.objects.create(
            user=self.user,
            role=self.role
        )
        self.assertEqual(self.user.user_roles.count(), 1)
        self.assertEqual(self.user.user_roles.first().role, self.role)
