import logging
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


async def publish_to_user(user_id: str, event_type: str, **kwargs):
    """
    Publica un evento a un usuario específico a través del channel layer.
    """
    channel_layer = get_channel_layer()
    group_name = f"user_{user_id}"
    
    event_data = {
        "type": event_type,
        **kwargs,
    }
    
    await channel_layer.group_send(group_name, event_data)
    logger.info(f"DEBUG: Evento '{event_type}' enviado al GRUPO DE USUARIO: {group_name}")


async def publish_to_session(session_id: int, event_type: str, **kwargs):
    """
    Publica un evento a una sesión específica (dispositivo) a través del channel layer.
    """
    if not session_id:
        logger.warning("DEBUG: Intentando publicar a sesión sin session_id")
        return
        
    channel_layer = get_channel_layer()
    group_name = f"session_{session_id}"
    
    event_data = {
        "type": event_type,
        **kwargs,
    }
    
    await channel_layer.group_send(group_name, event_data)
    logger.info(f"DEBUG: Evento '{event_type}' enviado al GRUPO DE SESIÓN: {group_name}")


async def notify_session_revoked(session_id: int):
    """
    Notifica a una sesión específica que ha sido revocada.
    """
    await publish_to_session(
        session_id=session_id,
        event_type="session_revoked",
        session_id_val=session_id,
    )


async def notify_session_revoked_to_user(user_id: str, session_id: int):
    """
    Notifica a TODO el grupo de un usuario que una sesión ha sido revocada.
    (Útil para actualizar listas en todos los dispositivos).
    """
    await publish_to_user(
        user_id=user_id,
        event_type="session_revoked_update",
        session_id=session_id,
    )


async def notify_token_expired(user_id: str):
    """Notifica a un usuario que su token ha expirado."""
    await publish_to_user(
        user_id=user_id,
        event_type="token_expired",
    )


async def notify_force_logout(user_id: str, message: str = "Has sido desconectado"):
    """Notifica a un usuario que ha sido desconectado forzosamente."""
    await publish_to_user(
        user_id=user_id,
        event_type="force_logout",
        message=message,
    )


async def notify_all_user_sessions_revoked(user_id: str):
    """Notifica que todas las sesiones del usuario han sido cerradas."""
    await publish_to_user(
        user_id=user_id,
        event_type="session_revoked",
        session_id=None,
        all_sessions=True,
    )