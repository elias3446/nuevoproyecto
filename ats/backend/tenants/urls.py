from django.urls import path
from .views import TenantPublicRegistrationView

urlpatterns = [
    path('register/', TenantPublicRegistrationView.as_view(), name='tenant-public-register'),
]
