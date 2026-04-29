from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Export
from .serializers import ExportSerializer, ExportRequestSerializer
from .tasks import process_data_export_task

class ExportCreateView(generics.CreateAPIView):
    """
    POST: Solicitar una nueva exportación de datos.
    Inicia la tarea asíncrona en Celery.
    """
    serializer_class = ExportRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 1. Crear el registro de exportación en estado PENDING
        export = Export.objects.create(
            user=request.user,
            export_type=serializer.validated_data['export_type'],
            format=serializer.validated_data['format'],
            filters=serializer.validated_data.get('filters', {}),
            status=Export.Status.PENDING
        )

        # 2. Registrar el acceso/exportación en AccessLog
        from audit.models import AccessLog, AuditAction
        from users.utils import get_client_ip
        
        AccessLog.objects.create(
            user=request.user,
            action=AuditAction.EXPORT,
            resource_type='DATA_EXPORT',
            resource_id=export.id,
            reason=f"Exportación solicitada: {export.export_type} ({export.format})",
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        # 3. Disparar tarea de Celery
        task = process_data_export_task.delay(str(export.id))
        
        # 4. Guardar el task_id para seguimiento
        export.task_id = task.id
        export.save()

        # 4. Responder al cliente
        return Response({
            "message": "Exportación iniciada. Recibirá una notificación cuando esté lista.",
            "export_id": export.id,
            "status": export.status,
            "task_id": export.task_id
        }, status=status.HTTP_202_ACCEPTED)

class ExportListView(generics.ListAPIView):
    """
    GET: Listar exportaciones recientes del usuario.
    """
    serializer_class = ExportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Export.objects.filter(user=self.request.user).order_by('-created_at')

class ExportDetailView(generics.RetrieveAPIView):
    """
    GET: Consultar el estado detallado de una exportación.
    """
    serializer_class = ExportSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Export.objects.filter(user=self.request.user)
