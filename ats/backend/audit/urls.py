from django.urls import path
from . import views

urlpatterns = [
    path('exports/', views.ExportCreateView.as_view(), name='export-create'),
    path('exports/list/', views.ExportListView.as_view(), name='export-list'),
    path('exports/<uuid:id>/', views.ExportDetailView.as_view(), name='export-detail'),
]
