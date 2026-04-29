from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.core.cache import cache
from .redis_manager import RedisSessionManager
from .models import UserSession
import logging

logger = logging.getLogger(__name__)

class SessionJWTAuthentication(JWTAuthentication):
    """
    Extensión de JWTAuthentication que valida que el session_id contenido 
    en el token siga marcado como activo en Redis (ultra-rápido) 
    o en la base de datos (fallback).
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        
        # Extraer session_id del token
        session_id = validated_token.get('session_id')
        
        if not session_id:
            # Si el token no tiene session_id (ej. tokens antiguos o de sistema),
            # dejamos pasar según la lógica estándar o podrías forzar que siempre tenga.
            return user

        # 1. Intentar validar vía Redis (Persistencia Rápida)
        is_active = RedisSessionManager.is_session_active(session_id)
        
        if not is_active:
            # 2. Fallback a Base de Datos si no está en Redis (evicción o sesión vieja)
            try:
                session = UserSession.objects.get(id=session_id, is_active=True)
                
                # Repoblar Redis para que la siguiente petición sea ultra-rápida
                session_data = {
                    "id": session.id,
                    "user_id": str(user.id),
                    "ip_address": session.ip_address,
                    "device_info": session.device_info,
                    "is_suspicious": session.is_suspicious,
                    "created_at": str(session.created_at),
                }
                RedisSessionManager.create_session(str(session_id), str(user.id), session_data)
            except UserSession.DoesNotExist:
                logger.warning(f"Intento de acceso con sesión revocada o inexistente: {session_id} - Usuario: {user.email}")
                raise AuthenticationFailed("La sesión ha sido cerrada o no es válida.", code="session_revoked")

        return user
