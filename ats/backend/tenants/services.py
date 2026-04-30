from django.db import connection
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

def setup_tenant_schema(tenant):
    """
    Crea el esquema físico en PostgreSQL y corre las migraciones necesarias.
    """
    schema_name = tenant.schema_name
    
    with connection.cursor() as cursor:
        # 1. Crear el esquema
        logger.info(f"Creando esquema para tenant: {schema_name}")
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        
        # 2. Establecer el search_path temporalmente para esta conexión
        # para que 'migrate' actúe sobre el esquema nuevo.
        # Incluimos auth y django para las tablas base si no están en public.
        cursor.execute(f"SET search_path TO {schema_name},public")
        
        try:
            # 3. Ejecutar migraciones
            # Nota: Esto puede ser lento. En escala masiva se recomienda 
            # usar un template de base de datos o clonar un esquema base.
            call_command('migrate', interactive=False, verbosity=1)
            logger.info(f"Migraciones completadas para el esquema: {schema_name}")
        except Exception as e:
            logger.error(f"Error migrando esquema {schema_name}: {str(e)}")
            raise e
        finally:
            # 4. Resetear search_path
            cursor.execute("SET search_path TO public")

def provision_tenant(tenant):
    """
    Orquestador para dar de alta un tenant.
    """
    try:
        setup_tenant_schema(tenant)
        # Aquí se podrían añadir más pasos:
        # - Crear usuario admin por defecto para el tenant.
        # - Notificar vía email.
        # - Configurar bucket de S3.
        return True
    except Exception:
        return False
