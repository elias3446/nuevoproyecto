from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermissionViewSet, RoleViewSet, UserRoleViewSet, UIConfigView, ModuleViewSet

router = DefaultRouter()
router.register(r'management', RoleViewSet, basename='roles')
router.register(r'assignments', UserRoleViewSet, basename='user-roles')
router.register(r'permissions', PermissionViewSet, basename='permissions')
router.register(r'modules', ModuleViewSet, basename='modules')

urlpatterns = [
    path('', include(router.urls)),
    path('ui-config/', UIConfigView.as_view(), name='ui-config'),
]
