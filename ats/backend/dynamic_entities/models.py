import uuid
from django.db import models
from ats_roles.models import Module

class EntityFieldType(models.TextChoices):
    TEXT = 'text', 'Texto'
    NUMBER = 'number', 'Número'
    DATE = 'date', 'Fecha'
    BOOLEAN = 'boolean', 'Booleano'
    SELECT = 'select', 'Selección'
    TEXTAREA = 'textarea', 'Área de Texto'

class EntityDefinition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, help_text="ID técnico (ej: vehiculos)")
    label = models.CharField(max_length=100, help_text="Nombre visible (ej: Vehículos)")
    module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name='dynamic_schema')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_entity_definitions'
        verbose_name = 'Definición de Entidad'
        verbose_name_plural = 'Definiciones de Entidades'

    def __str__(self):
        return self.label

class FieldDefinition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity = models.ForeignKey(EntityDefinition, on_delete=models.CASCADE, related_name='fields')
    name = models.CharField(max_length=50, help_text="ID técnico del campo (ej: placa)")
    label = models.CharField(max_length=100, help_text="Nombre visible del campo (ej: Placa)")
    field_type = models.CharField(max_length=20, choices=EntityFieldType.choices, default=EntityFieldType.TEXT)
    is_required = models.BooleanField(default=False)
    options = models.JSONField(null=True, blank=True, help_text="Opciones para campos tipo 'select' [v1, v2]")
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'dynamic_field_definitions'
        verbose_name = 'Definición de Campo'
        verbose_name_plural = 'Definiciones de Campos'
        ordering = ['order']
        unique_together = ['entity', 'name']

class DynamicData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity = models.ForeignKey(EntityDefinition, on_delete=models.CASCADE, related_name='data_records')
    data = models.JSONField(help_text="Datos reales del registro en formato JSON")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'dynamic_data_records'
        verbose_name = 'Dato Dinámico'
        verbose_name_plural = 'Datos Dinámicos'
        ordering = ['-created_at']
