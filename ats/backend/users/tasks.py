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