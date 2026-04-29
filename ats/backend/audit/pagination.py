from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.cache import cache
import hashlib
import json


class RedisCachedPageNumberPagination(PageNumberPagination):
    """
    Paginación con caché en Redis.

    La estrategia de caché se aplica en la vista (override de list()),
    NO en paginate_queryset, para no romper el flujo interno de DRF.

    Uso en la vista:
        class MyView(generics.ListAPIView):
            pagination_class = MyPagination

            def list(self, request, *args, **kwargs):
                return self.pagination_class.cached_list(self, request, *args, **kwargs)

    Para invalidar la caché de un usuario:
        MyPagination.invalidate('prefix', user_id)
    """
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100
    cache_ttl = 60
    cache_prefix = "paginated"

    # ── Helpers ──────────────────────────────────────────────────────────────

    @classmethod
    def _make_key(cls, prefix: str, user_id: str, page, page_size, extra_params: dict = None) -> str:
        suffix = ""
        if extra_params:
            suffix = ":" + hashlib.md5(
                json.dumps(extra_params, sort_keys=True).encode()
            ).hexdigest()[:8]
        return f"{prefix}:{user_id}:p{page}:s{page_size}{suffix}"

    @classmethod
    def invalidate(cls, cache_prefix: str, user_id: str):
        """
        Elimina todas las páginas cacheadas de un usuario.
        El formato real de la clave en Redis es:
            {KEY_PREFIX}:1:{cache_prefix}:{user_id}:p{page}:s{page_size}
        """
        # Estrategia 1: delete_pattern de django_redis (más eficiente)
        try:
            cache.delete_pattern(f"*{cache_prefix}:{user_id}:*")
            return
        except Exception:
            pass

        # Estrategia 2: borrar combinaciones conocidas de página/tamaño
        try:
            common_sizes = [10, 20, 50, 100]
            keys = []
            for page in range(1, 21):       # primeras 20 páginas
                for size in common_sizes:
                    keys.append(cls._make_key(cache_prefix, user_id, page, size))
            cache.delete_many(keys)
        except Exception:
            pass

    @classmethod
    def cached_list(cls, view, request, *args, **kwargs):
        """
        Helper para usar en views. Envuelve el flujo DRF estándar con caché Redis.

        Ejemplo:
            def list(self, request, *args, **kwargs):
                return ExportsPagination.cached_list(self, request, *args, **kwargs)
        """
        user_id = str(request.user.id) if request.user.is_authenticated else "anon"
        page       = request.query_params.get("page", 1)
        page_size  = request.query_params.get("page_size", cls.page_size)
        extra      = {k: v for k, v in request.query_params.items()
                      if k not in ("page", "page_size")}
        cache_key  = cls._make_key(cls.cache_prefix, user_id, page, page_size, extra)

        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # Cold path: delegar al flujo DRF normal
        from rest_framework.mixins import ListModelMixin
        response = ListModelMixin.list(view, request, *args, **kwargs)

        # Guardar solo respuestas 200 con datos paginados
        if response.status_code == 200 and isinstance(response.data, dict) and "results" in response.data:
            cache.set(cache_key, response.data, timeout=cls.cache_ttl)

        return response

    # ── get_paginated_response estándar ──────────────────────────────────────

    def get_paginated_response(self, data):
        return Response({
            "count":     self.page.paginator.count,
            "num_pages": self.page.paginator.num_pages,
            "next":      self.get_next_link(),
            "previous":  self.get_previous_link(),
            "results":   data,
        })

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


# ── Subclases por entidad ─────────────────────────────────────────────────────

class ExportsPagination(RedisCachedPageNumberPagination):
    page_size    = 10
    cache_prefix = "exports"
    cache_ttl    = 15   # segundos — corto para que datos activos refresquen rápido
