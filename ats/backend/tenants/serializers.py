from rest_framework import serializers
from .models import Tenant
from django.contrib.auth import get_user_model

User = get_user_model()

class TenantRegistrationSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True)

    class Meta:
        model = Tenant
        fields = ['name', 'subdomain', 'admin_email', 'admin_password']

    def validate_subdomain(self, value):
        # Validar que el subdominio sea alfanumérico y no contenga caracteres raros
        if not value.isalnum():
            raise serializers.ValidationError("El subdominio solo debe contener letras y números.")
        return value.lower()

    def create(self, validated_data):
        admin_email = validated_data.pop('admin_email')
        admin_password = validated_data.pop('admin_password')
        
        # El schema_name será el subdominio con prefijo
        validated_data['schema_name'] = f"tenant_{validated_data['subdomain']}"
        
        tenant = Tenant.objects.create(**validated_data)
        
        # Nota: El administrador del tenant se creará en el esquema correspondiente
        # después de que el esquema se haya creado. Por simplicidad en este MVP,
        # lo creamos en el esquema público y lo vinculamos, pero en multi-tenant 
        # estricto debería crearse dentro del esquema. 
        # Como nuestro User está en el esquema 'auth', es compartido.
        
        User.objects.create_user(
            email=admin_email,
            password=admin_password,
            is_active=True
        )
        
        return tenant
