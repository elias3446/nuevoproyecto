from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.cache import cache
import hashlib
import json


class RedisCachedPageNumberPagination(PageNumberPagination):
    """
    Paginación con caché en Redis.

    Almacena cada página bajo la clave:
        {cache_prefix}:{user_id}:p{page}:s{page_size}

    TTL configurable por subclase (default 60 s).
    Para invalidar todo el listado de un usuario:
        RedisCachedPageNumberPagination.invalidate(cache_prefix, user_id)
    """
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100
    cache_ttl = 60          # segundos
    cache_prefix = "paginated"  # sobreescribir en subclases

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _cache_key(self, request) -> str:
        user_id = str(request.user.id) if request.user.is_authenticated else "anon"
        page    = self.get_page_number(request, self)
        size    = self.get_page_size(request)
        # Incluir filtros extra en la clave para evitar colisiones
        params  = {k: v for k, v in request.query_params.items()
                   if k not in ("page", "page_size")}
        suffix  = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()[:8]
        return f"{self.cache_prefix}:{user_id}:p{page}:s{size}:{suffix}"

    @classmethod
    def invalidate(cls, cache_prefix: str, user_id: str):
        """
        Elimina todas las entradas de caché para un usuario específico.
        Utiliza el patrón de claves de Redis (requiere django-redis).
        """
        try:
            from django_redis import get_redis_connection
            client = get_redis_connection("default")
            # El prefijo de django_redis antepone 'django:' por defecto
            pattern = f"django:{cache_prefix}:{user_id}:*"
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
        except Exception:
            pass  # Si Redis no está disponible, no rompemos el flujo

    # ── Override principal ────────────────────────────────────────────────────

    def paginate_queryset(self, queryset, request, view=None):
        """Intenta servir desde caché; si falla, consulta la DB."""
        self._cache_key_value = self._cache_key(request)
        cached = cache.get(self._cache_key_value)
        if cached is not None:
            # Restaurar estado necesario para get_paginated_response
            self.count   = cached["count"]
            self.request = request
            # Simular atributos de la página
            self._cached_response = cached
            self.page = type("FakePage", (), {
                "paginator": type("FakePaginator", (), {"num_pages": cached["num_pages"]})(),
                "number": cached["page_number"],
                "has_next": lambda self: cached["has_next"],
                "has_previous": lambda self: cached["has_previous"],
            })()
            return None  # Señal de que usamos caché

        result = super().paginate_queryset(queryset, request, view)
        return result

    def get_paginated_response(self, data):
        """Si hay caché, devuelve directo; si no, guarda y responde."""
        if hasattr(self, "_cached_response"):
            return Response(self._cached_response["payload"])

        payload = {
            "count":    self.page.paginator.count,
            "num_pages": self.page.paginator.num_pages,
            "next":     self.get_next_link(),
            "previous": self.get_previous_link(),
            "results":  data,
        }

        # Guardar en caché
        cache.set(self._cache_key_value, {
            "count":       self.page.paginator.count,
            "num_pages":   self.page.paginator.num_pages,
            "page_number": self.page.number,
            "has_next":    self.page.has_next(),
            "has_previous": self.page.has_previous(),
            "payload":     payload,
        }, timeout=self.cache_ttl)

        return Response(payload)

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "count":     {"type": "integer"},
                "num_pages": {"type": "integer"},
                "next":      {"type": "string", "nullable": True},
                "previous":  {"type": "string", "nullable": True},
                "results":   schema,
            },
        }


# ── Subclases reutilizables por entidad ──────────────────────────────────────

class ExportsPagination(RedisCachedPageNumberPagination):
    page_size    = 10
    cache_prefix = "exports"
    cache_ttl    = 60
