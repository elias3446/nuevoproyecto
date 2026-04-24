from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='cleanup_expired_tokens')
def cleanup_expired_tokens():
    """
    Elimina tokens expirados de la blacklist y outstanding tokens.
    Se ejecuta diariamente via Celery Beat.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        GRACE_PERIOD = timedelta(days=2)
        cutoff = timezone.now() - GRACE_PERIOD
        
        outstanding_count = OutstandingToken.objects.filter(
            expires_at__lt=cutoff
        ).delete()[0]
        
        blacklisted_count = BlacklistedToken.objects.filter(
            token__expires_at__lt=cutoff
        ).delete()[0]
        
        total = outstanding_count + blacklisted_count
        logger.info(f"Cleanup: eliminados {total} tokens expirados")
        
        return f"Eliminados {total} tokens expirados"
    except Exception as e:
        logger.error(f"Error en cleanup_expired_tokens: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='cleanup_inactive_sessions')
def cleanup_inactive_sessions():
    """
    Cleanup sesiones de usuario inactivas por más de 30 días.
    Se ejecuta diariamente via Celery Beat.
    """
    try:
        from .models import UserSession
        
        GRACE_PERIOD = timedelta(days=30)
        cutoff = timezone.now() - GRACE_PERIOD
        
        inactive_count = UserSession.objects.filter(
            last_used__lt=cutoff,
            is_active=True
        ).update(is_active=False)
        
        logger.info(f"Cleanup: {inactive_count} sesiones marcadas como inactivas")
        
        return f"{inactive_count} sesiones inactivas limpiadas"
    except Exception as e:
        logger.error(f"Error en cleanup_inactive_sessions: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='revoke_session_token_task')
def revoke_session_token_task(session_id: int):
    """
    Tarea asíncrona para invalidar una sesión y poner su token en la Blacklist.
    Redis actúa como broker para esta solicitud.
    """
    try:
        from .models import UserSession
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        session = UserSession.objects.get(id=session_id)
        jti = session.refresh_token_jti
        
        # 1. Marcar sesión como inactiva
        session.is_active = False
        session.save()
        
        # 2. Blacklist el token si existe en OutstandingTokens
        if jti:
            try:
                token = OutstandingToken.objects.get(jti=jti)
                BlacklistedToken.objects.get_or_create(token=token)
                logger.info(f"Token {jti} añadido a la blacklist exitosamente")
            except OutstandingToken.DoesNotExist:
                logger.warning(f"No se encontró el token outstanding para JTI {jti}")
        
        return f"Sesión {session_id} revocada y token invalidado"
        
    except UserSession.DoesNotExist:
        logger.error(f"Error: Sesión {session_id} no encontrada para revocar")
        return "Sesión no encontrada"
    except Exception as e:
        logger.error(f"Error en revoke_session_token_task: {str(e)}")
        return f"Error: {str(e)}"