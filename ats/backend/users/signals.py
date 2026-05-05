from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import UserSession
from ats.mixins import cache_invalidator_receiver

@receiver(post_save, sender=UserSession)
@receiver(post_delete, sender=UserSession)
def invalidate_user_session_cache(sender, instance, **kwargs):
    """
    Invalida el cache de Redis de forma INSTANTÁNEA cada vez que hay cambios.
    No esperamos a Celery para asegurar que el siguiente GET ya vea los cambios.
    """
    from django.core.cache import cache
    try:
        # Invalidación inmediata para sesiones (crítico para UX)
        pattern = "*:api_cache:usersession:*"
        cache.delete_pattern(pattern)
        
        # También disparamos la notificación de WebSocket
        from .tasks import notify_user_sessions_update_task
        notify_user_sessions_update_task.delay(str(instance.user.id))
    except Exception:
        pass
