from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Tenant
from .services import setup_tenant_schema
import threading

@receiver(post_save, sender=Tenant)
def handle_tenant_creation(sender, instance, created, **kwargs):
    if created:
        # Ejecutamos en un thread separado para no bloquear la respuesta HTTP
        # si se crea desde una vista. En producción, esto debería ser una 
        # TAREA DE CELERY (cola 'default' o 'urgent').
        thread = threading.Thread(target=setup_tenant_schema, args=(instance,))
        thread.start()
