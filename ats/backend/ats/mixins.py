from django.core.cache import cache
from rest_framework.response import Response
import hashlib
import logging

logger = logging.getLogger(__name__)

class CachedListMixin:
    """
    Mixin para cachear respuestas de listado en Redis.
    Permite personalización de la estructura de respuesta mediante wrap_cached_response.
    """
    cache_timeout = 300
    
    def get_cache_key(self):
        user_id = self.request.user.id if self.request.user.is_authenticated else "anon"
        path = self.request.get_full_path()
        # Obtener el nombre del modelo de forma robusta
        queryset = getattr(self, 'queryset', None)
        if queryset is None and hasattr(self, 'get_queryset'):
            queryset = self.get_queryset()
        
        model_name = queryset.model._meta.model_name if queryset is not None else "unknown"
        session_id = getattr(self.request, 'session_id', 'no-session')
        
        raw_key = f"{model_name}:{user_id}:{session_id}:{path}"
        return f"api_cache:{model_name}:{hashlib.md5(raw_key.encode()).hexdigest()}"

    def wrap_cached_response(self, data):
        """
        Permite a las subclases envolver los datos cacheados.
        Por defecto devuelve los datos tal cual.
        """
        return data

    def list(self, request, *args, **kwargs):
        cache_key = self.get_cache_key()
        cached_data = cache.get(cache_key)
        
        if cached_data:
            logger.debug(f"Cache hit for {cache_key}")
            # Importante: Permitir que la vista envuelva los datos antes de responder
            return Response(self.wrap_cached_response(cached_data))
        
        # Cold path
        response = super().list(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Guardamos la data original (sin envolver) para que el cache sea puro
            cache.set(cache_key, response.data, self.cache_timeout)
            logger.debug(f"Cache stored for {cache_key}")
            
            # Devolvemos la data envuelta
            response.data = self.wrap_cached_response(response.data)
            
        return response

    @staticmethod
    def invalidate_cache(model_name):
        try:
            pattern = f"*:api_cache:{model_name}:*"
            cache.delete_pattern(pattern)
            logger.info(f"Invalidated all cache for model: {model_name}")
        except Exception as e:
            logger.error(f"Error invalidating cache for {model_name}: {e}")

def cache_invalidator_receiver(sender, **kwargs):
    """
    Receptor universal para señales post_save y post_delete.
    Lanza una tarea de Celery para invalidar el cache en segundo plano.
    """
    from .tasks import invalidate_model_cache_task
    model_name = sender._meta.model_name
    # Usar .delay() para procesar asincrónicamente
    invalidate_model_cache_task.delay(model_name)
