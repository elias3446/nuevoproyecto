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
        # Eliminamos is_staff e is_active de extra_fields ya que ahora son propiedades
        extra_fields.pop('is_staff', None)
        extra_fields.pop('is_active', None)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    
    # Mapeos especiales para Supabase
    password = models.CharField(max_length=255, db_column='encrypted_password')
    last_login = models.DateTimeField(null=True, blank=True, db_column='last_sign_in_at')
    is_superuser = models.BooleanField(default=False, db_column='is_super_admin')
    
    # Metadata estilo Supabase
    raw_app_meta_data = models.JSONField(default=dict, blank=True)
    raw_user_meta_data = models.JSONField(default=dict, blank=True)
    
    # AuditorÃ­a (compatibles con Supabase)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = SupabaseUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    # --- Atributos Virtuales (No se guardan en la DB) ---
    @property
    def is_staff(self):
        # En Supabase, si eres super_admin, eres staff para Django
        return self.is_superuser

    @property
    def is_active(self):
        # PodrÃ­amos vincularlo a 'email_confirmed_at', pero por ahora 
        # devolvemos True para no bloquear el acceso.
        return True

    class Meta:
        db_table = '"auth"."users"'
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    def __str__(self):
        return self.email
