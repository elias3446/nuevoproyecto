from .models import PermissionAction

# Definición centralizada del menú y sus permisos requeridos
UI_MENU_STRUCTURE = [
    {
        "id": "dashboard",
        "label": "Dashboard",
        "icon": "LayoutDashboard",
        "route": "/dashboard",
        "required_permission": None
    },
    {
        "id": "vacantes",
        "label": "Vacantes",
        "icon": "Briefcase",
        "route": "/dashboard/vacantes",
        "required_permission": "job:read"
    },
    {
        "id": "candidatos",
        "label": "Candidatos",
        "icon": "Users",
        "route": "/dashboard/candidatos",
        "required_permission": "candidate:read"
    },
    {
        "id": "cv-espontaneos",
        "label": "CV Espontáneos",
        "icon": "FileText",
        "route": "/dashboard/cv-espontaneos",
        "required_permission": "candidate:read"
    },
    {
        "id": "formularios",
        "label": "Formularios",
        "icon": "ClipboardList",
        "route": "/dashboard/formularios",
        "required_permission": "form:read"
    },
    {
        "id": "analytics",
        "label": "Analytics",
        "icon": "BarChart3",
        "route": "/dashboard/analytics",
        "required_permission": "analytics:read"
    },
    {
        "id": "profile",
        "label": "Perfil",
        "icon": "UserCircle",
        "route": "/dashboard/profile",
        "required_permission": None
    },
    {
        "id": "security",
        "label": "Roles y Accesos",
        "icon": "Shield",
        "route": "/dashboard/security",
        "required_permission": "user:manage_roles"
    },
]
