import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class UserNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket Consumer para notificaciones en tiempo real.
    Permite al cliente recibir eventos como: session_revoked, token_expired, etc.
    """

    async def connect(self):
        self.user = None
        self.room_group_name = None

        # Verificar autenticación
        if self.scope["user"].is_authenticated:
            self.user = self.scope["user"]
            self.room_group_name = f"user_{self.user.id}"

            # Unirse al grupo del usuario
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Unirse al grupo de la sesión específica
            session_id = self.scope.get('session_id')
            if session_id:
                self.session_group_name = f"session_{session_id}"
                await self.channel_layer.group_add(
                    self.session_group_name,
                    self.channel_name
                )
                logger.info(f"WebSocket unido a grupo de sesión: {self.session_group_name}")

            await self.accept()
            logger.info(f"WebSocket conectado: usuario {self.user.email}")
        else:
            # Rechazar conexión no autenticada
            await self.close()

    async def disconnect(self, close_code):
        if self.room_group_name and self.channel_name:
            # Salir del grupo
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            if hasattr(self, 'session_group_name'):
                await self.channel_layer.group_discard(
                    self.session_group_name,
                    self.channel_name
                )
            logger.info(f"WebSocket desconectado: usuario {self.user.email if self.user else 'unknown'}")

    async def receive(self, text_data=None, bytes_data=None):
        """Manejar mensajes recibidos del cliente."""
        if text_data:
            try:
                data = json.loads(text_data)
                logger.debug(f"Mensaje recibido: {data}")
            except json.JSONDecodeError:
                logger.warning(f"Mensaje JSON inválido: {text_data}")

    async def session_revoked(self, event):
        """Evento: sesión revocada."""
        await self.send(text_data=json.dumps({
            "type": "session_revoked",
            "session_id": event.get("session_id"),
            "message": "Tu sesión ha sido cerrada desde otro dispositivo",
        }))

    async def token_expired(self, event):
        """Evento: token expirado."""
        await self.send(text_data=json.dumps({
            "type": "token_expired",
            "message": "Tu sesión ha expirado",
        }))

    async def force_logout(self, event):
        """Evento: logout forzado desde admin."""
        await self.send(text_data=json.dumps({
            "type": "force_logout",
            "message": event.get("message", "Has sido desconectado"),
        }))