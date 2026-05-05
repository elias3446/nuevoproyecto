from django.core.management.base import BaseCommand
from ats_roles.models import Permission, Role, RolePermission, PermissionAction, PermissionCategory, Module
from ats_roles.ui_config import UI_MENU_STRUCTURE
import uuid

class Command(BaseCommand):
    help = 'Semilla inicial para permisos y roles estándar'

    def handle(self, *args, **options):
        self.stdout.write('Iniciando seeding de permisos...')
        
        # 1. Poblar Permisos
        for action_value, action_label in PermissionAction.choices:
            # Intentar deducir la categoría del prefijo de la acción (ej: "job:create" -> "jobs")
            category_prefix = action_value.split(':')[0]
            category = category_prefix + 's' if not category_prefix.endswith('s') else category_prefix
            
            # Ajustes especiales de categoría
            if category == 'candidates': category = PermissionCategory.CANDIDATES
            elif category == 'jobs': category = PermissionCategory.JOBS
            elif category == 'users': category = PermissionCategory.USERS
            
            Permission.objects.update_or_create(
                action=action_value,
                defaults={
                    'description': action_label,
                    'category': category if category in PermissionCategory.values else ''
                }
            )

        self.stdout.write(self.style.SUCCESS('Permisos sincronizados correctamente.'))

        # 1.1 Crear Módulos desde UI_MENU_STRUCTURE
        self.stdout.write('Sincronizando módulos...')
        for index, item in enumerate(UI_MENU_STRUCTURE):
            module, created = Module.objects.update_or_create(
                name=item['id'],
                defaults={
                    'label': item['label'],
                    'icon': item['icon'],
                    'route': item['route'],
                    'order': index,
                    'is_active': True
                }
            )
            
            # Vincular permisos de la categoría al módulo
            # Buscamos permisos que coincidan con la lógica del módulo
            # Ej: Módulo "vacantes" -> Permisos con categoría "jobs"
            cat_map = {
                "vacantes": "jobs",
                "candidatos": "candidates",
                "cv-espontaneos": "candidates",
                "formularios": "forms",
                "analytics": "analytics",
                "security": "users"
            }
            
            target_cat = cat_map.get(module.name)
            if target_cat:
                Permission.objects.filter(category=target_cat).update(module=module)

        self.stdout.write(self.style.SUCCESS('Módulos sincronizados correctamente.'))

        # 2. Crear Roles Estándar
        roles_data = [
            {
                'name': 'Administrador',
                'description': 'Acceso total al sistema y gestión de usuarios.',
                'is_system': True,
                'permissions': PermissionAction.values # Todos los permisos
            },
            {
                'name': 'Reclutador',
                'description': 'Gestión de vacantes, candidatos y procesos de selección.',
                'is_system': True,
                'permissions': [
                    PermissionAction.JOB_READ, PermissionAction.JOB_UPDATE,
                    PermissionAction.CANDIDATE_CREATE, PermissionAction.CANDIDATE_READ,
                    PermissionAction.CANDIDATE_UPDATE, PermissionAction.CANDIDATE_MOVE_STAGE,
                    PermissionAction.ACTIVITY_CREATE, PermissionAction.ACTIVITY_READ,
                    PermissionAction.MESSAGE_SEND, PermissionAction.MESSAGE_READ,
                    PermissionAction.SUBMISSION_READ, PermissionAction.SUBMISSION_REVIEW,
                    PermissionAction.ANALYTICS_READ
                ]
            },
            {
                'name': 'Entrevistador',
                'description': 'Acceso para revisión de candidatos y envío de evaluaciones.',
                'is_system': True,
                'permissions': [
                    PermissionAction.JOB_READ,
                    PermissionAction.CANDIDATE_READ,
                    PermissionAction.ACTIVITY_CREATE, PermissionAction.ACTIVITY_READ,
                    PermissionAction.SUBMISSION_READ, PermissionAction.SUBMISSION_REVIEW
                ]
            }
        ]

        for r_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=r_data['name'],
                defaults={
                    'description': r_data['description'],
                    'is_system': r_data['is_system']
                }
            )
            
            if created:
                self.stdout.write(f'Rol "{role.name}" creado.')
            else:
                self.stdout.write(f'Rol "{role.name}" ya existe. Sincronizando permisos...')

            # Sincronizar permisos del rol
            current_perms = set(role.role_permissions.values_list('permission__action', flat=True))
            target_perms = set(r_data['permissions'])
            
            # Añadir faltantes
            perms_to_add = target_perms - current_perms
            for action in perms_to_add:
                try:
                    p = Permission.objects.get(action=action)
                    RolePermission.objects.create(role=role, permission=p)
                except Permission.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'Permiso {action} no encontrado.'))

        self.stdout.write(self.style.SUCCESS('Seeding completado con éxito.'))
