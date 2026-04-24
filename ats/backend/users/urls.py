from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, RegisterSuperuserView, UserProfileView, LogoutView, 
    CheckSetupView, CustomTokenObtainPairView, TokenRefreshCookieView,
    UserSessionsView, RevokeSessionView, LogoutAllDevicesView
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    return Response({
        'register': reverse('auth_register', request=request, format=format),
        'register_superuser': reverse('auth_register_superuser', request=request, format=format),
        'login': reverse('token_obtain_pair', request=request, format=format),
        'logout': reverse('auth_logout', request=request, format=format),
        'token_refresh': reverse('token_refresh', request=request, format=format),
        'me': reverse('user_profile', request=request, format=format),
        'check_setup': reverse('check_setup', request=request, format=format),
    })

urlpatterns = [
    # API Root
    path('', api_root, name='api-root'),
    
    # Auth endpoints
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('register-superuser/', RegisterSuperuserView.as_view(), name='auth_register_superuser'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),
    path('token/refresh/cookie/', TokenRefreshCookieView.as_view(), name='token_refresh_cookie'),
    
    # User endpoints
    path('me/', UserProfileView.as_view(), name='user_profile'),
    path('check-setup/', CheckSetupView.as_view(), name='check_setup'),
    
    # Sessions endpoints
    path('sessions/', UserSessionsView.as_view(), name='user_sessions'),
    path('sessions/<int:session_id>/', RevokeSessionView.as_view(), name='revoke_session'),
    path('logout-all/', LogoutAllDevicesView.as_view(), name='logout_all_devices'),
]
