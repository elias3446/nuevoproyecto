import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class SupabaseUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.pop('is_staff', None)
        extra_fields.pop('is_active', None)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    
    password = models.CharField(max_length=255, db_column='encrypted_password')
    last_login = models.DateTimeField(null=True, blank=True, db_column='last_sign_in_at')
    is_superuser = models.BooleanField(default=False, db_column='is_super_admin')
    
    raw_app_meta_data = models.JSONField(default=dict, blank=True)
    raw_user_meta_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = SupabaseUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def is_staff(self):
        return self.is_superuser

    @property
    def is_active(self):
        return True

    def has_perm(self, perm, obj=None):
        """Superadmins tienen todos los permisos; el resto usa ats_roles."""
        return self.is_superuser

    def has_module_perms(self, app_label):
        """Superadmins tienen acceso a todos los módulos."""
        return self.is_superuser

    class Meta:
        db_table = '"auth"."users"'
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'
        managed = False

    def __str__(self):
        return self.email


class UserSession(models.Model):
    RISK_LEVELS = [
        ('low', 'Bajo'),
        ('medium', 'Medio'),
        ('high', 'Alto'),
        ('critical', 'Crítico'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sessions'
    )
    refresh_token_jti = models.CharField(max_length=255, unique=True)
    device_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField()
    country = models.CharField(max_length=2, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    user_agent = models.TextField(blank=True, default='')
    is_current = models.BooleanField(default=False)
    is_suspicious = models.BooleanField(default=False)
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.ip_address}"


class UserLoginActivity(models.Model):
    RISK_LEVELS = [
        ('low', 'Bajo'),
        ('medium', 'Medio'),
        ('high', 'Alto'),
        ('critical', 'Crítico'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='login_history'
    )
    ip_address = models.GenericIPAddressField()
    country = models.CharField(max_length=2, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    user_agent = models.TextField(blank=True, default='')
    device_info = models.JSONField(default=dict, blank=True)
    success = models.BooleanField()
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS, default='low')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_login_activity'
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.risk_level}"
