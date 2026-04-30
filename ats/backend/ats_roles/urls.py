from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermissionListView, RoleViewSet, UserRoleViewSet, UIConfigView

router = DefaultRouter()
router.register(r'management', RoleViewSet, basename='roles')
router.register(r'assignments', UserRoleViewSet, basename='user-roles')

urlpatterns = [
    path('', include(router.urls)),
    path('permissions/', PermissionListView.as_view(), name='permission-list'),
    path('ui-config/', UIConfigView.as_view(), name='ui-config'),
]
