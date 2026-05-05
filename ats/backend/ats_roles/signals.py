from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Role, Module, Permission
from ats.mixins import cache_invalidator_receiver

# Conectar los modelos a la lógica de invalidación automática
@receiver(post_save, sender=Role)
@receiver(post_delete, sender=Role)
def invalidate_role_cache(sender, instance, **kwargs):
    cache_invalidator_receiver(sender, **kwargs)

@receiver(post_save, sender=Module)
@receiver(post_delete, sender=Module)
def invalidate_module_cache(sender, instance, **kwargs):
    cache_invalidator_receiver(sender, **kwargs)

@receiver(post_save, sender=Permission)
@receiver(post_delete, sender=Permission)
def invalidate_permission_cache(sender, instance, **kwargs):
    cache_invalidator_receiver(sender, **kwargs)
