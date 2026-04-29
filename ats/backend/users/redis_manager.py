import json
from django.core.cache import cache
from django.conf import settings
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)

# Configuración de prefijos y tiempos
SESSION_KEY_PREFIX = "ats:session"
USER_SESSIONS_SET_PREFIX = "ats:user_sessions"
# El TTL de Redis debería ser un poco más largo que el REFRESH_TOKEN_LIFETIME
DEFAULT_TIMEOUT = 86400 * 30  # 30 días

class RedisSessionManager:
    """
    Gestor de persistencia de sesiones en Redis.
    Desacopla la validación de sesiones de la base de datos principal.
    """

    @staticmethod
    def _get_session_key(session_id: str) -> str:
        return f"{SESSION_KEY_PREFIX}:{session_id}"

    @staticmethod
    def _get_user_set_key(user_id: str) -> str:
        return f"{USER_SESSIONS_SET_PREFIX}:{user_id}"

    @classmethod
    def create_session(cls, session_id: str, user_id: str, data: dict, timeout: int = DEFAULT_TIMEOUT):
        """
        Almacena una nueva sesión en Redis.
        - Guarda el hash de datos de la sesión.
        - Añade el ID de sesión al Set del usuario.
        """
        try:
            session_key = cls._get_session_key(session_id)
            user_set_key = cls._get_user_set_key(user_id)

            # 1. Guardar datos de la sesión como un diccionario JSON stringificado o Hash
            # Usamos cache.set con un diccionario por simplicidad con django-redis
            session_data = {
                **data,
                "user_id": str(user_id),
                "session_id": str(session_id),
            }
            cache.set(session_key, session_data, timeout)

            # 2. Añadir al índice de sesiones por usuario
            # Nota: Usamos el cliente nativo para operaciones de Set si es necesario, 
            # pero django-redis permite trabajar con estructuras si se configura.
            # Como fallback simple, mantendremos una lista o usaremos el cliente directamente.
            client = cache.client.get_client()
            client.sadd(user_set_key, session_id)
            client.expire(user_set_key, timeout)

            logger.info(f"Sesión Redis creada: {session_id} para usuario {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error creando sesión en Redis: {e}")
            return False

    @classmethod
    def get_session(cls, session_id: str) -> Optional[dict]:
        """Recupera los datos de una sesión activa."""
        return cache.get(cls._get_session_key(session_id))

    @classmethod
    def is_session_active(cls, session_id: str) -> bool:
        """Verifica si una sesión existe en Redis."""
        return cache.has_key(cls._get_session_key(session_id))

    @classmethod
    def revoke_session(cls, session_id: str, user_id: str = None):
        """
        Elimina una sesión de Redis.
        """
        try:
            session_key = cls._get_session_key(session_id)
            
            # Si no tenemos el user_id, intentamos obtenerlo de la sesión antes de borrarla
            if not user_id:
                data = cls.get_session(session_id)
                if data:
                    user_id = data.get('user_id')

            # 1. Borrar la sesión
            cache.delete(session_key)

            # 2. Quitar del índice del usuario
            if user_id:
                user_set_key = cls._get_user_set_key(user_id)
                client = cache.client.get_client()
                client.srem(user_set_key, session_id)
            
            logger.info(f"Sesión Redis revocada: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error revocando sesión en Redis: {e}")
            return False

    @classmethod
    def revoke_all_user_sessions(cls, user_id: str):
        """Revoca todas las sesiones de un usuario en Redis de forma atómica."""
        try:
            user_set_key = cls._get_user_set_key(user_id)
            client = cache.client.get_client()
            
            # Obtener todos los IDs de sesión
            session_ids = client.smembers(user_set_key)
            
            if session_ids:
                # Borrar cada llave de sesión
                keys_to_delete = [cls._get_session_key(sid.decode() if isinstance(sid, bytes) else sid) for sid in session_ids]
                cache.delete_many(keys_to_delete)
                
            # Borrar el set de índice
            cache.delete(user_set_key)
            
            logger.info(f"Todas las sesiones de Redis revocadas para usuario {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error revocando todas las sesiones en Redis: {e}")
            return False

    @classmethod
    def get_active_sessions_count(cls, user_id: str) -> int:
        """Retorna el número de sesiones activas en Redis para un usuario."""
        try:
            user_set_key = cls._get_user_set_key(user_id)
            client = cache.client.get_client()
            return client.scard(user_set_key)
        except Exception:
            return 0

    @classmethod
    def list_user_sessions(cls, user_id: str) -> List[Dict]:
        """Lista los datos de todas las sesiones activas de un usuario en Redis."""
        try:
            user_set_key = cls._get_user_set_key(user_id)
            client = cache.client.get_client()
            session_ids = client.smembers(user_set_key)
            
            sessions = []
            for sid in session_ids:
                sid_str = sid.decode() if isinstance(sid, bytes) else sid
                data = cls.get_session(sid_str)
                if data:
                    sessions.append(data)
                else:
                    # Si el ID está en el set pero la sesión expiró/borró, limpiar índice
                    client.srem(user_set_key, sid_str)
            
            return sessions
        except Exception as e:
            logger.error(f"Error listando sesiones de Redis: {e}")
            return []
