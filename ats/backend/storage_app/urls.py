from django.urls import path
from . import views

urlpatterns = [
    path('bucket/', views.UserStorageBucketView.as_view(), name='user-bucket'),
    path('files/', views.UserFileListView.as_view(), name='file-list'),
    path('upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('upload/status/<uuid:pk>/', views.AsyncUploadStatusView.as_view(), name='upload-status'),
    path('files/<uuid:pk>/', views.FileDetailView.as_view(), name='file-detail'),
]
