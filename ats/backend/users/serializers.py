from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserSession

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'created_at', 'raw_user_meta_data', 'permissions', 'roles')
        read_only_fields = ('id', 'created_at')

    def get_permissions(self, obj):
        from ats_roles.services import PermissionService
        return list(PermissionService.get_user_permissions(obj))

    def get_roles(self, obj):
        return list(obj.user_roles.values_list('role__name', flat=True))

class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ('id', 'ip_address', 'device_info', 'country', 'city', 
                  'last_used', 'is_current', 'is_active')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password')

    def create(self, validated_data):
        # El método create_user del manager maneja el hasheo de la contraseña
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class RegisterSuperuserSerializer(RegisterSerializer):
    def create(self, validated_data):
        # El método create_superuser del manager crea al usuario con is_staff=True y is_superuser=True
        user = User.objects.create_superuser(
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
