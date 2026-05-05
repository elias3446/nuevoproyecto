from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EntityDefinitionViewSet, DynamicDataViewSet

router = DefaultRouter()
router.register(r'schemas', EntityDefinitionViewSet)
router.register(r'data', DynamicDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
