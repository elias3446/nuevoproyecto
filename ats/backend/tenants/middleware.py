from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from .models import Tenant

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware para identificar el tenant y establecer el esquema de DB correspondiente.
    """
    def process_request(self, request):
        # 1. Identificar el tenant desde un header (ej: X-Tenant-Subdomain)
        # O podrías usar request.get_host().split('.')[0] para subdominios
        tenant_subdomain = request.headers.get('X-Tenant-Subdomain')
        
        if not tenant_subdomain:
            # Fallback a esquema público o defecto
            self.set_schema('public')
            return

        try:
            # En producción, esto debería estar en caché de Redis para evitar una query por request
            tenant = Tenant.objects.get(subdomain=tenant_subdomain, is_active=True)
            self.set_schema(tenant.schema_name)
            request.tenant = tenant
        except Tenant.DoesNotExist:
            self.set_schema('public')
            request.tenant = None

    def set_schema(self, schema_name):
        """
        Cambia el search_path de la conexión actual.
        Agregamos 'public', 'auth', 'django' como básicos.
        """
        with connection.cursor() as cursor:
            # ADVERTENCIA: Sanitizar schema_name o asegurar que viene de DB confiable
            # para evitar inyección SQL. Aquí usamos un valor de nuestra DB.
            path = f"{schema_name},ats,auth,django,public"
            cursor.execute(f"SET search_path TO {path}")

    def process_response(self, request, response):
        # Opcional: resetear al final del request si es necesario (poolers)
        return response
