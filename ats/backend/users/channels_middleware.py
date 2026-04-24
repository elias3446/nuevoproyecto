from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Custom middleware that takes a token from the query string and authenticates the user.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            try:
                # Decodificar el token para obtener el user_id y session_id
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                scope['jti'] = access_token.get('jti')
                scope['session_id'] = access_token.get('session_id')
                # Obtener el usuario de la DB
                scope['user'] = await get_user(user_id)
            except Exception as e:
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
