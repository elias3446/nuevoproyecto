import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

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
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """
    Modelo de Usuario que mapea a la tabla auth.users de Supabase.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    
    # Campos obligatorios para Django Admin
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Metadata estilo Supabase
    raw_app_meta_data = models.JSONField(default=dict, blank=True)
    raw_user_meta_data = models.JSONField(default=dict, blank=True)
    
    # Auditoría (compatibles con Supabase)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_sign_in_at = models.DateTimeField(null=True, blank=True)

    objects = SupabaseUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        # IMPORTANTE: Esto le dice a Django que use el esquema 'auth' y la tabla 'users'
        db_table = '"auth"."users"'
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    def __str__(self):
        return self.email
