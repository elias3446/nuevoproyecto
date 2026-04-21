from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserSerializer, RegisterSuperuserSerializer
from .custom_jwt import CustomTokenObtainPairSerializer
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"success": "Logged out correctly"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

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
