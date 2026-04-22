from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model
from datetime import timedelta

User = get_user_model()

REMEMBER_ME_LIFETIME = timedelta(days=30)
DEFAULT_REFRESH_TOKEN_LIFETIME = timedelta(days=1)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    remember_me = serializers.BooleanField(required=False, default=False)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        return token

    def validate(self, attrs):
        remember_me = attrs.pop('remember_me', False)
        data = super().validate(attrs)

        data['remember_me'] = remember_me

        return data