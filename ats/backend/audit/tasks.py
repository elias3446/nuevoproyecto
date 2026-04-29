import csv
import json
import io
import uuid
import logging
from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from .models import Export, AuditLog, AccessLog

logger = logging.getLogger(__name__)

@shared_task(name='process_data_export_task', bind=True, max_retries=2)
def process_data_export_task(self, export_id):
    """
    Tarea asíncrona para generar archivos de exportación (CSV/JSON).
    """
    try:
        export = Export.objects.get(id=export_id)
        export.status = Export.Status.PROCESSING
        export.save()

        # 1. Obtener los datos según el tipo
        data_queryset = []
        filename_prefix = ""
        
        if export.export_type == 'AUDIT_LOGS':
            data_queryset = AuditLog.objects.all()
            filename_prefix = "audit_logs"
        elif export.export_type == 'ACCESS_LOGS':
            data_queryset = AccessLog.objects.all()
            filename_prefix = "access_logs"
        
        # Aplicar filtros si existen (ejemplo simple)
        filters = export.filters or {}
        if filters.get('user_id'):
            data_queryset = data_queryset.filter(user_id=filters['user_id'])
        
        # Limitar para no saturar memoria en este ejemplo (en prod usar iterator)
        export.record_count = data_queryset.count()
        export.save()

        # 2. Generar el contenido del archivo
        buffer = io.StringIO()
        filename = f"{filename_prefix}_{export.id}.{export.format}"
        
        if export.format == 'csv':
            if export.export_type == 'AUDIT_LOGS':
                writer = csv.writer(buffer)
                writer.writerow(['ID', 'Usuario', 'Acción', 'Tabla', 'ID Registro', 'Fecha'])
                for log in data_queryset.iterator():
                    writer.writerow([
                        str(log.id), 
                        str(log.user), 
                        log.action, 
                        log.table_name, 
                        str(log.record_id), 
                        log.created_at.strftime('%Y-%m-%d %H:%M:%S')
                    ])
            elif export.export_type == 'ACCESS_LOGS':
                writer = csv.writer(buffer)
                writer.writerow(['ID', 'Usuario', 'Acción', 'IP', 'País', 'Ciudad', 'Dispositivo', 'Razón', 'Fecha'])
                for log in data_queryset.iterator():
                    # Intentar obtener info del dispositivo si está en JSON
                    device = log.device_info or {}
                    device_str = f"{device.get('browser', 'Unknown')} ({device.get('os', 'Unknown')})"
                    
                    writer.writerow([
                        str(log.id),
                        str(log.user),
                        log.action,
                        log.ip_address,
                        log.country or 'N/A',
                        log.city or 'N/A',
                        device_str,
                        log.reason,
                        log.created_at.strftime('%Y-%m-%d %H:%M:%S')
                    ])
            else:
                writer = csv.writer(buffer)
                writer.writerow(['Exportación genérica', 'ID', str(export.id)])

        elif export.format == 'json':
            # Para JSON, convertimos el queryset a lista de dicts
            # (Ejemplo simplificado)
            results = list(data_queryset.values()[:1000]) # Límite de seguridad
            # Convertir UUIDs a string para JSON
            for r in results:
                for k, v in r.items():
                    if isinstance(v, uuid.UUID):
                        r[k] = str(v)
                    elif hasattr(v, 'strftime'):
                        r[k] = v.strftime('%Y-%m-%d %H:%M:%S')
            
            buffer.write(json.dumps(results, indent=2))

        # 3. Subir al storage
        bucket_name = f"user_{export.user.id}"
        file_path = f"{bucket_name}/exports/{filename}"
        
        content_file = ContentFile(buffer.getvalue().encode('utf-8'), name=filename)
        saved_path = default_storage.save(file_path, content_file)
        
        # 4. Finalizar
        export.status = Export.Status.COMPLETED
        export.file_url = default_storage.url(saved_path)
        export.save()

        logger.info(f"Exportación {export_id} completada exitosamente.")
        return export.file_url

    except Exception as e:
        logger.error(f"Error en exportación {export_id}: {str(e)}")
        try:
            export = Export.objects.get(id=export_id)
            export.status = Export.Status.FAILED
            export.error_message = str(e)
            export.save()
        except:
            pass
        raise self.retry(exc=e, countdown=60)
