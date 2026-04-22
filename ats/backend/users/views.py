from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer, RegisterSuperuserSerializer
from .custom_jwt import CustomTokenObtainPairSerializer, REMEMBER_ME_LIFETIME
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

AUTH_COOKIE = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'refresh_token')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        
        remember_me = request.data.get('remember_me', False)
        
        if remember_me and response.data.get('refresh'):
            max_age = REMEMBER_ME_LIFETIME.total_seconds()
            response.set_cookie(
                key=AUTH_COOKIE,
                value=response.data['refresh'],
                max_age=max_age,
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG,
                path='/',
            )
            del response.data['refresh']
        
        return response

class RegisterView(generics.CreateAPIView):
    queryset = None
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generar tokens automáticamente al registrarse
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

class RegisterSuperuserView(generics.CreateAPIView):
    queryset = None
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSuperuserSerializer

    def post(self, request, *args, **kwargs):
        # En producción deberías proteger esto (ej. pidiendo un secret_token)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "Superusuario creado exitosamente",
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_COOKIE)
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        
        response = Response({"success": "Logged out correctly"}, status=status.HTTP_205_RESET_CONTENT)
        response.delete_cookie(AUTH_COOKIE, path='/')
        
        return response

class TokenRefreshCookieView(TokenRefreshView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(AUTH_COOKIE)
        
        if not refresh_token:
            return Response({"error": "No refresh token found"}, status=status.HTTP_401_UNAUTHORIZED)
        
        request.data['refresh'] = refresh_token
        return super().post(request, *args, **kwargs)

class CheckSetupView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        try:
            User = get_user_model()
            # Si hay algÃºn error al consultar la tabla, devolvemos 'setup_needed: True'
            # para permitir al usuario intentar configurar el administrador.
            setup_needed = not User.objects.exists()
            return Response({"setup_needed": setup_needed}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error en CheckSetupView: {str(e)}")
            # En lugar de fallar con 500, asumimos que se necesita setup 
            # (esto suele pasar cuando las tablas ni siquiera estÃ¡n creadas)
            return Response({"setup_needed": True, "error_info": str(e)}, status=status.HTTP_200_OK)
