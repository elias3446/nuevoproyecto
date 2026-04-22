import uuid
from django.db import models
from django.conf import settings


class PermissionAction(models.TextChoices):
    # Jobs
    JOB_CREATE = 'job:create', 'Crear vacantes'
    JOB_READ = 'job:read', 'Ver vacantes'
    JOB_UPDATE = 'job:update', 'Editar vacantes'
    JOB_DELETE = 'job:delete', 'Eliminar vacantes'
    JOB_ASSIGN_RECRUITER = 'job:assign_recruiter', 'Asignar responsables a vacantes'
    # Candidates
    CANDIDATE_CREATE = 'candidate:create', 'Crear candidatos'
    CANDIDATE_READ = 'candidate:read', 'Ver candidatos'
    CANDIDATE_UPDATE = 'candidate:update', 'Editar candidatos'
    CANDIDATE_DELETE = 'candidate:delete', 'Eliminar candidatos'
    CANDIDATE_MOVE_STAGE = 'candidate:move_stage', 'Mover entre etapas del pipeline'
    # Activities
    ACTIVITY_CREATE = 'activity:create', 'Crear actividades'
    ACTIVITY_READ = 'activity:read', 'Ver actividades'
    ACTIVITY_DELETE = 'activity:delete', 'Eliminar actividades'
    # Messages
    MESSAGE_SEND = 'message:send', 'Enviar mensajes'
    MESSAGE_READ = 'message:read', 'Ver mensajes'
    MESSAGE_DELETE = 'message:delete', 'Eliminar mensajes'
    # Forms
    FORM_CREATE = 'form:create', 'Crear formularios'
    FORM_READ = 'form:read', 'Ver formularios'
    FORM_UPDATE = 'form:update', 'Editar formularios'
    FORM_DELETE = 'form:delete', 'Eliminar formularios'
    FORM_ASSIGN = 'form:assign', 'Asignar formularios a vacantes'
    # Submissions
    SUBMISSION_READ = 'submission:read', 'Ver envíos de formularios'
    SUBMISSION_REVIEW = 'submission:review', 'Revisar envíos'
    SUBMISSION_APPROVE = 'submission:approve', 'Aprobar/rechazar envíos'
    # Analytics
    ANALYTICS_READ = 'analytics:read', 'Ver analytics'
    ANALYTICS_EXPORT = 'analytics:export', 'Exportar reportes'
    # Users
    USER_INVITE = 'user:invite', 'Invitar usuarios'
    USER_MANAGE_ROLES = 'user:manage_roles', 'Gestionar roles de usuarios'
    # Settings
    SETTINGS_MANAGE = 'settings:manage', 'Gestionar configuración del sistema'


class PermissionCategory(models.TextChoices):
    JOBS = 'jobs', 'Vacantes'
    CANDIDATES = 'candidates', 'Candidatos'
    ACTIVITIES = 'activities', 'Actividades'
    MESSAGES = 'messages', 'Mensajes'
    FORMS = 'forms', 'Formularios'
    SUBMISSIONS = 'submissions', 'Envíos'
    ANALYTICS = 'analytics', 'Analytics'
    USERS = 'users', 'Usuarios'
    SETTINGS = 'settings', 'Configuración'


class ResourceType(models.TextChoices):
    JOB = 'job', 'Vacante'
    DEPARTMENT = 'department', 'Departamento'


class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(
        max_length=50,
        unique=True,
        choices=PermissionAction.choices
    )
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=PermissionCategory.choices,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permissions'
        verbose_name = 'Permiso'
        verbose_name_plural = 'Permisos'

    def __str__(self):
        return self.action


class Role(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.name


class RolePermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='role_permissions'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_permissions'
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'role_permissions'
        unique_together = ['role', 'permission']
        verbose_name = 'Permiso de Rol'
        verbose_name_plural = 'Permisos de Roles'


class UserRole(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_roles'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='user_roles'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_roles'
    )

    class Meta:
        db_table = 'user_roles'
        unique_together = ['user', 'role']
        verbose_name = 'Rol de Usuario'
        verbose_name_plural = 'Roles de Usuarios'


class UserResourcePermission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resource_permissions'
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='user_resource_permissions'
    )
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices
    )
    resource_id = models.UUIDField()
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='granted_permissions'
    )
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'user_resource_permissions'
        unique_together = [
            'user', 'permission', 'resource_type', 'resource_id'
        ]
        verbose_name = 'Permiso de Recurso'
        verbose_name_plural = 'Permisos de Recursos'

    def __str__(self):
        return f"{self.user} - {self.permission.action} -> {self.resource_type}:{self.resource_id}"