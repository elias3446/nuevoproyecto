from django.apps import AppConfig


class AtsRolesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ats_roles'
    verbose_name = 'Roles y Permisos ATS'

    def ready(self):
        import ats_roles.signals