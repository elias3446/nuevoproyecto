from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from .serializers import RegisterSerializer, UserSerializer, RegisterSuperuserSerializer
from .custom_jwt import CustomTokenObtainPairSerializer, REMEMBER_ME_LIFETIME
from .utils import (
    get_client_ip,
    parse_user_agent,
    get_geolocation,
    calculate_risk_level,
    register_login_activity,
    create_user_session,
    invalidate_session,
    invalidate_all_user_sessions,
    get_active_sessions,
)
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

AUTH_COOKIE = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'refresh_token')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            user = serializer.instance if hasattr(serializer, 'instance') else None
            if user:
                register_login_activity(
                    user=user,
                    ip_address=get_client_ip(request),
                    device_info=parse_user_agent(request),
                    country='',
                    city='',
                    success=False,
                    risk_level='high',
                )
            raise e
        
        user = serializer.user
        remember_me = request.data.get('remember_me', False)
        
        ip = get_client_ip(request)
        geo = get_geolocation(ip)
        device_info = parse_user_agent(request)
        
        history = list(
            user.login_history.filter(success=True).order_by('-created_at')[:10]
        )
        
        risk_level, risk_details = calculate_risk_level(user, {
            'ip_address': ip,
            'country': geo.get('country', ''),
            'device_info': device_info,
        }, history)
        
        register_login_activity(
            user=user,
            ip_address=ip,
            device_info=device_info,
            country=geo.get('country', ''),
            city=geo.get('city', ''),
            success=True,
            risk_level=risk_level,
        )
        
        self.risk_level = risk_level
        self.user_obj = user
        
        if remember_me:
            max_age = int(REMEMBER_ME_LIFETIME.total_seconds())
        else:
            max_age = 86400

        # Almacenamos el serializador para usarlo en finalize_response
        self.login_serializer = serializer
        
        return super().post(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        if response.status_code == 200 and response.data.get('access'):
            user_obj = getattr(self, 'user_obj', None)
            if not user_obj:
                return super().finalize_response(request, response, *args, **kwargs)
            
            remember_me = request.data.get('remember_me', False)
            risk_level = getattr(self, 'risk_level', 'low')
            response.data['risk_level'] = risk_level
            
            # Manejo de Cookie si hay remember_me
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
                refresh_token_str = response.data['refresh']
                del response.data['refresh']
            else:
                refresh_token_str = response.data.get('refresh')
            
            # Crear la sesión en DB
            if refresh_token_str:
                try:
                    refresh = RefreshToken(refresh_token_str)
                    jti = refresh.get('jti')
                    
                    ip = get_client_ip(request)
                    geo = get_geolocation(ip)
                    device_info = parse_user_agent(request)
                    is_suspicious = risk_level in ('high', 'critical')
                    
                    create_user_session(
                        user=user_obj,
                        refresh_token_jti=jti,
                        ip_address=ip,
                        device_info=device_info,
                        country=geo.get('country', ''),
                        city=geo.get('city', ''),
                        is_suspicious=is_suspicious,
                    )
                except Exception as e:
                    logger.error(f"Error creating session: {e}")
        
        return super().finalize_response(request, response, *args, **kwargs)


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
        refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_COOKIE)
        
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                jti = token.get('jti')
                token.blacklist()
                invalidate_session(jti)
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
            setup_needed = not User.objects.exists()
            return Response({"setup_needed": setup_needed}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error en CheckSetupView: {str(e)}")
            return Response({"setup_needed": True, "error_info": str(e)}, status=status.HTTP_200_OK)


class UserSessionsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        sessions = get_active_sessions(request.user)
        return Response({"sessions": sessions, "count": len(sessions)})


class RevokeSessionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, session_id):
        from .models import UserSession
        try:
            session = UserSession.objects.get(id=session_id, user=request.user, is_active=True)
            session.is_active = False
            session.save()
            return Response({"success": "Sesión cerrada"})
        except UserSession.DoesNotExist:
            return Response({"error": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)


class LogoutAllDevicesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        count = invalidate_all_user_sessions(request.user)
        
        refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_COOKIE)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        
        response = Response({
            "success": "Todas las sesiones cerradas",
            "sessions_closed": count
        }, status=status.HTTP_200_OK)
        response.delete_cookie(AUTH_COOKIE, path='/')
        
        return response
