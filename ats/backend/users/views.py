from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from .serializers import (
    RegisterSerializer, 
    UserSerializer, 
    RegisterSuperuserSerializer,
    UserSessionSerializer
)
from .custom_jwt import CustomTokenObtainPairSerializer, REMEMBER_ME_LIFETIME
from .utils import (
    get_client_ip,
    parse_user_agent,
    get_geolocation,
    calculate_risk_level,
    register_login_activity,
    create_user_session,
    invalidate_session,
    update_session_jti,
    invalidate_all_user_sessions,
    invalidate_all_user_tokens,
    get_active_sessions
)
from .redis_manager import RedisSessionManager
from .notifications import (
    notify_session_revoked,
    notify_session_revoked_to_user,
    notify_all_user_sessions_revoked,
)
from .tasks import revoke_session_token_task
from django.contrib.auth import get_user_model
from django.utils import timezone
import os
import logging

logger = logging.getLogger(__name__)

AUTH_COOKIE = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'refresh_token')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        ip = get_client_ip(request)
        geo = get_geolocation(ip)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            user = serializer.instance if hasattr(serializer, 'instance') else None
            if user:
                register_login_activity(
                    user=user,
                    ip_address=ip,
                    device_info=parse_user_agent(request),
                    country=geo.get('country', 'Unknown'),
                    country_code=geo.get('country_code', 'XX'),
                    city=geo.get('city', 'Unknown'),
                    state=geo.get('state', 'Unknown'),
                    isp=geo.get('isp', 'Unknown'),
                    is_vpn=geo.get('is_vpn', False),
                    is_proxy=geo.get('is_proxy', False),
                    risk_score=geo.get('risk_score', 0),
                    success=False,
                    risk_level='high',
                )
            raise e
        
        user = serializer.user
        remember_me = request.data.get('remember_me', False)
        
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
            country=geo.get('country', 'Unknown'),
            country_code=geo.get('country_code', 'XX'),
            city=geo.get('city', 'Unknown'),
            state=geo.get('state', 'Unknown'),
            isp=geo.get('isp', 'Unknown'),
            is_vpn=geo.get('is_vpn', False),
            is_proxy=geo.get('is_proxy', False),
            risk_score=geo.get('risk_score', 0),
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
                    ip = get_client_ip(request)
                    geo = get_geolocation(ip)
                    device_info = parse_user_agent(request)
                    is_suspicious = risk_level in ('high', 'critical')
                    
                    # Usar el token original para obtener el JTI inicial
                    temp_refresh = RefreshToken(refresh_token_str)
                    jti = temp_refresh.get('jti')

                    session = create_user_session(
                        user=user_obj,
                        refresh_token_jti=jti,
                        ip_address=ip,
                        device_info=device_info,
                        country=geo.get('country', 'Unknown'),
                        country_code=geo.get('country_code', 'XX'),
                        city=geo.get('city', 'Unknown'),
                        state=geo.get('state', 'Unknown'),
                        isp=geo.get('isp', 'Unknown'),
                        is_vpn=geo.get('is_vpn', False),
                        is_proxy=geo.get('is_proxy', False),
                        risk_score=geo.get('risk_score', 0),
                        is_suspicious=is_suspicious,
                    )
                    
                    # IMPORTANTE: Inyectar el session_id en los tokens del response
                    refresh = RefreshToken(refresh_token_str)
                    refresh['session_id'] = session.id
                    
                    new_refresh_str = str(refresh)
                    response.data['refresh'] = new_refresh_str
                    response.data['access'] = str(refresh.access_token)
                    
                    # Actualizar la cookie con el token que ya tiene el session_id
                    response.set_cookie(
                        key=AUTH_COOKIE,
                        value=new_refresh_str,
                        max_age=REMEMBER_ME_LIFETIME.total_seconds(),
                        httponly=True,
                        samesite='Lax',
                        secure=not settings.DEBUG,
                        path='/',
                    )
                except Exception as e:
                    logger.error(f"Error creating session or injecting session_id: {e}")
        
        return super().finalize_response(request, response, *args, **kwargs)


from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    queryset = None
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Enviar correo de bienvenida y finalizar registro (Asíncrono)
        from .tasks import send_welcome_email_task, complete_user_registration_task
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        
        send_welcome_email_task.delay(user.email)
        complete_user_registration_task.delay(str(user.id), ip, ua)
        
        # Generar tokens automáticamente al registrarse
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

@method_decorator(csrf_exempt, name='dispatch')
class RegisterSuperuserView(generics.CreateAPIView):
    queryset = None
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSuperuserSerializer

    def post(self, request, *args, **kwargs):
        # En producción deberías proteger esto (ej. pidiendo un secret_token)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Finalizar registro (Asíncrono)
        from .tasks import send_welcome_email_task, complete_user_registration_task
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        
        send_welcome_email_task.delay(user.email)
        complete_user_registration_task.delay(str(user.id), ip, ua)
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "Superusuario creado exitosamente",
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        
        if 'avatar_url' in request.data:
            avatar_url = request.data.get('avatar_url')
            # Update avatar_url in raw_user_meta_data
            meta = user.raw_user_meta_data or {}
            if avatar_url is None:
                meta.pop('avatar_url', None)
            else:
                meta['avatar_url'] = avatar_url
            user.raw_user_meta_data = meta
            user.save()
            
            # Audit log
            from audit.models import AuditLog
            AuditLog.objects.create(
                user=user,
                action='UPDATE',
                table_name='auth.users',
                record_id=user.id,
                new_values={'avatar_url': avatar_url},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
        
        return Response(UserSerializer(user).data)

class LogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        print(f"DEBUG LOGOUT: Iniciando proceso para usuario {request.user.email}")
        refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_COOKIE)
        
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                jti = token.get('jti')
                print(f"DEBUG LOGOUT: JTI recibido = {jti}")
                token.blacklist()
                
                if not invalidate_session(jti):
                    print(f"DEBUG LOGOUT: JTI {jti} no encontrado. Ejecutando fallback.")
                    from .models import UserSession
                    session = UserSession.objects.filter(user=request.user, is_active=True).order_by('-last_used').first()
                    if session:
                        session.is_active = False
                        session.save()
                        print(f"DEBUG LOGOUT: Sesión cerrada vía fallback.")
                else:
                    print(f"DEBUG LOGOUT: Sesión cerrada vía JTI.")
            except Exception as e:
                print(f"DEBUG LOGOUT: ERROR = {str(e)}")
                invalidate_all_user_sessions(request.user)
        else:
            print("DEBUG LOGOUT: No se recibió refresh token en body ni cookies.")
            # Si no hay token, pero el usuario quiere salir, cerramos todo lo que tenga activo
            invalidate_all_user_sessions(request.user)
        
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
        
        # Validar que la sesión asociada al refresh token siga activa en Redis
        try:
            token = RefreshToken(refresh_token)
            session_id = token.get('session_id')
            if session_id:
                if not RedisSessionManager.is_session_active(str(session_id)):
                    # Fallback a DB
                    from .models import UserSession
                    try:
                        session = UserSession.objects.get(id=session_id, is_active=True)
                        # Repoblar Redis
                        RedisSessionManager.create_session(str(session_id), str(session.user.id), {"id": session.id})
                    except UserSession.DoesNotExist:
                        return Response({"error": "Session revoked"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception:
            pass

        return super().post(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        # Si el refresh fue exitoso y hubo rotación de token
        if response.status_code == 200 and response.data.get('refresh'):
            old_refresh = request.data.get('refresh')
            new_refresh = response.data.get('refresh')
            
            # 1. Actualizar la Cookie con el nuevo token rotado
            response.set_cookie(
                key=AUTH_COOKIE,
                value=new_refresh,
                max_age=REMEMBER_ME_LIFETIME.total_seconds(),
                httponly=True,
                samesite='Lax',
                secure=not settings.DEBUG,
                path='/',
            )
            
            # 2. Sincronizar nuestra tabla de sesiones con el nuevo JTI
            if old_refresh and new_refresh:
                try:
                    refresh_obj = RefreshToken(old_refresh)
                    session_id = refresh_obj.get('session_id')
                    
                    # Propagar el session_id al nuevo token
                    new_refresh_obj = RefreshToken(new_refresh)
                    if session_id:
                        new_refresh_obj['session_id'] = session_id
                        # Como hemos modificado el token, hay que regenerar el string y la cookie
                        new_refresh_str = str(new_refresh_obj)
                        response.data['refresh'] = new_refresh_str
                        response.data['access'] = str(new_refresh_obj.access_token)
                        
                        response.set_cookie(
                            key=AUTH_COOKIE,
                            value=new_refresh_str,
                            max_age=REMEMBER_ME_LIFETIME.total_seconds(),
                            httponly=True,
                            samesite='Lax',
                            secure=not settings.DEBUG,
                            path='/',
                        )
                    
                    user_id = refresh_obj.get('user_id')
                    User = get_user_model()
                    try:
                        user = User.objects.get(id=user_id)
                        
                        old_jti = refresh_obj.get('jti')
                        new_jti = RefreshToken(new_refresh).get('jti')
                        
                        update_session_jti(user, old_jti, new_jti)
                    except User.DoesNotExist:
                        logger.warning(f"User {user_id} not found during token rotation. Cleaning up.")
                        response.delete_cookie(AUTH_COOKIE, path='/')
                except Exception as e:
                    logger.error(f"Error rotando JTI de sesión: {e}")
            
            # Opcional: eliminar el refresh del body si prefieres solo cookies
            # del response.data['refresh']
                    
        return super().finalize_response(request, response, *args, **kwargs)

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


class UserSessionsView(generics.ListAPIView):
    serializer_class = UserSessionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return get_active_sessions(self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # Identificar dinámicamente la sesión actual usando el session_id del token
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        current_session_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token_str = auth_header.split(' ')[1]
                token = AccessToken(token_str)
                current_session_id = token.get('session_id')
            except Exception:
                pass
        
        # Marcar la sesión actual en los datos devueltos
        for session_data in data:
            if current_session_id and session_data['id'] == current_session_id:
                session_data['is_current'] = True
            else:
                # Asegurarse de que las demás no estén marcadas como current
                session_data['is_current'] = False
                
        return Response({"sessions": data})


class RevokeSessionView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, session_id):
        from asgiref.sync import async_to_sync
        from .models import UserSession
        try:
            session = UserSession.objects.get(id=session_id, user=request.user, is_active=True)
            session_id_val = session.id
            
            # 1. Marcar como inactiva en DB y Redis
            session.is_active = False
            session.save()
            RedisSessionManager.revoke_session(str(session_id_val), str(request.user.id))
            
            # 2. Solicitar a Redis/Celery que invalide el token (Blacklist)
            revoke_session_token_task.delay(session_id_val)
            
            # 3. Notificar específicamente a la sesión revocada para que cierre sesión
            async_to_sync(notify_session_revoked)(session_id_val)
            
            # 4. Notificar al resto de dispositivos para que actualicen la lista
            async_to_sync(notify_session_revoked_to_user)(str(request.user.id), session_id_val)
            
            return Response({"success": "Sesión cerrada"})
        except UserSession.DoesNotExist:
            return Response({"error": "Sesión no encontrada"}, status=status.HTTP_404_NOT_FOUND)


class LogoutAllDevicesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        from asgiref.sync import async_to_sync
        from .models import UserSession
        
        # Obtener todas las sesiones activas del usuario
        active_sessions = UserSession.objects.filter(user=request.user, is_active=True)
        count = active_sessions.count()
        
        # 1. Marcar todas las sesiones como inactivas en Redis y DB
        RedisSessionManager.revoke_all_user_sessions(str(request.user.id))
        active_sessions.update(is_active=False)
        
        # 2. Solicitar a Redis/Celery la invalidación de cada token (Blacklist)
        for session in active_sessions:
            revoke_session_token_task.delay(session.id)
        
        refresh_token = request.data.get("refresh") or request.COOKIES.get(AUTH_COOKIE)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        
        # Notificar a todos los dispositivos via WebSocket
        async_to_sync(notify_all_user_sessions_revoked)(str(request.user.id))
        
        response = Response({
            "success": "Todas las sesiones cerradas",
            "sessions_closed": count
        }, status=status.HTTP_200_OK)
        response.delete_cookie(AUTH_COOKIE, path='/')
        
        return response


class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from django.core.mail import send_mail
        from django.conf import settings
        from django.template.loader import render_to_string
        import secrets
        from datetime import timedelta
        from .models import PasswordResetToken

        email = request.data.get('email')

        if not email:
            return Response(
                {'error': 'El correo electrónico es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        import os
        User = get_user_model()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Si el correo existe, recibirás un enlace de recuperación'},
                status=status.HTTP_200_OK
            )

        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=15)

        ip_address = get_client_ip(request)

        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at,
            ip_address=ip_address
        )

        reset_url = f"{settings.FRONTEND_URL}/password-reset/confirm/{token}"

        # Enviar correo de recuperación asíncronamente
        from .tasks import send_password_reset_email_task
        send_password_reset_email_task.delay(user.email, reset_url)

        return Response(
            {'detail': 'Si el correo existe, recibirás un enlace de recuperación'},
            status=status.HTTP_200_OK
        )



class PasswordResetValidateTokenView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, token):
        from .models import PasswordResetToken

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Token inválido'},
                status=status.HTTP_404_NOT_FOUND
            )

        if reset_token.used:
            return Response(
                {'valid': False, 'error': 'Este enlace ya ha sido utilizado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        if reset_token.expires_at < timezone.now():
            return Response(
                {'valid': False, 'error': 'El enlace ha expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'valid': True,
            'email': reset_token.user.email
        })


class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from .models import PasswordResetToken

        token = request.data.get('token')
        new_password = request.data.get('new_password')
        new_password_confirm = request.data.get('new_password_confirm')

        if not token or not new_password:
            return Response(
                {'error': 'Token y nueva contraseña son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != new_password_confirm:
            return Response(
                {'error': 'Las contraseñas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'La contraseña debe tener al menos 8 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_404_NOT_FOUND
            )

        if reset_token.used:
            return Response(
                {'error': 'Este enlace ya ha sido utilizado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils import timezone
        if reset_token.expires_at < timezone.now():
            return Response(
                {'error': 'El enlace ha expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = reset_token.user
        user.set_password(new_password)
        user.save()

        reset_token.used = True
        reset_token.save()

        from .utils import invalidate_all_user_sessions, get_client_ip
        invalidate_all_user_sessions(user)

        # Notificación y Auditoría (Asíncrono)
        from .tasks import notify_password_change_task
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        notify_password_change_task.delay(str(user.id), ip, ua)

        return Response(
            {'detail': 'Contraseña actualizada correctamente. Por favor, inicia sesión con tu nueva contraseña.'},
            status=status.HTTP_200_OK
        )


class PasswordChangeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        new_password_confirm = request.data.get('new_password_confirm')

        if not all([current_password, new_password, new_password_confirm]):
            return Response(
                {'error': 'Todos los campos son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        if not user.check_password(current_password):
            return Response(
                {'error': 'La contraseña actual es incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != new_password_confirm:
            return Response(
                {'error': 'Las contraseñas nuevas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response(
                {'error': e.messages},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        from .utils import invalidate_all_user_sessions, get_client_ip
        invalidate_all_user_sessions(user)

        # Notificación y Auditoría (Asíncrono)
        from .tasks import notify_password_change_task
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', '')
        notify_password_change_task.delay(str(user.id), ip, ua)

        refresh_token = request.COOKIES.get(AUTH_COOKIE)
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        response = Response(
            {'detail': 'Contraseña actualizada correctamente'},
            status=status.HTTP_200_OK
        )
        response.delete_cookie(AUTH_COOKIE, path='/')

        return response
