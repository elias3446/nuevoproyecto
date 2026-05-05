from celery import shared_task
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

@shared_task(name="invalidate_model_cache_task")
def invalidate_model_cache_task(model_name):
    """
    Tarea de Celery para invalidar la caché de Redis en segundo plano.
    """
    try:
        # El patrón coincide con el definido en el Mixin
        pattern = f"*:api_cache:{model_name}:*"
        cache.delete_pattern(pattern)
        logger.info(f"CELERY: Cache invalidated for model '{model_name}'")
        return f"Success: Invalidated {model_name}"
    except Exception as e:
        logger.error(f"CELERY: Error invalidating cache for {model_name}: {e}")
        return f"Error: {str(e)}"
