"""
ASGI config for config project.
Supports HTTP and WebSocket via Django Channels + Redis.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Import your WebSocket URL patterns here:
from users.routing import websocket_urlpatterns
from users.channels_middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JWTAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
            )
        )
    ),
})
