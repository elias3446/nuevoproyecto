from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'created_at', 'raw_user_meta_data')
        read_only_fields = ('id', 'created_at')

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
