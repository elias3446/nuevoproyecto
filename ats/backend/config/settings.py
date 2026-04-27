"""
Django settings for config project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR.parent / '.env')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    # ALLOWED_HOSTS logic with variable expansion
    _raw_hosts = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    _server_ip = os.environ.get('SERVER_IP', '')

    ALLOWED_HOSTS = []
    for host in _raw_hosts:
        clean_host = host.strip()
        if clean_host == '${SERVER_IP}' and _server_ip:
            ALLOWED_HOSTS.append(_server_ip)
        elif clean_host:
            ALLOWED_HOSTS.append(clean_host)

    # Aseguramos que la IP del servidor esté siempre presente si existe
    if _server_ip and _server_ip not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_server_ip)

# Trust Nginx proxy headers
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    'channels',
    # App
    'users',
    # JWT Blacklist
    'rest_framework_simplejwt.token_blacklist',
    # Celery
    'django_celery_beat',
    'django_celery_results',
    # ATS Apps
    'ats_roles',
    'ats',
    'audit',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


# â”€â”€â”€ Database Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_db_host = os.environ.get('DB_HOST', 'localhost')
_db_options = {'sslmode': 'require'} if 'supabase.co' in _db_host else {}

# Database config base
_db_base = {
    'ENGINE':   'django.db.backends.postgresql',
    'NAME':     os.environ.get('DB_NAME', 'postgres'),
    'USER':     os.environ.get('DB_USER', 'postgres'),
    'PASSWORD': os.environ.get('DB_PASSWORD', ''),
    'HOST':     _db_host,
    'PORT':     os.environ.get('DB_PORT', '5432'),
}

import sys
IS_TESTING = 'test' in sys.argv

if IS_TESTING:
    # Para tests usamos una sola base de datos y manejamos esquemas vÃ­a search_path
    DATABASES = {
        'default': {
            **_db_base,
            'OPTIONS': { 
                **_db_options, 
                'options': '-c search_path=django,auth,celery,jwt,public' 
            },
        }
    }
    DATABASE_ROUTERS = []
    
    # Crear esquemas necesarios en la base de datos de test
    from django.db.models.signals import pre_migrate
    def create_test_schemas(sender, **kwargs):
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("CREATE SCHEMA IF NOT EXISTS django;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS auth;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS celery;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS jwt;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS ats_roles;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS ats;")
            cursor.execute("CREATE SCHEMA IF NOT EXISTS audit;")
    pre_migrate.connect(create_test_schemas)
else:
    # Configuración normal multi-esquema
    DATABASES = {
        'default': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=ats,auth,django,public' },
        },
        'common_db': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=django,auth,public' },
        },
        'roles_db': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=ats_roles,auth,django,public' },
        },
        'celery_db': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=celery,auth,django,public' },
        },
        'jwt_db': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=jwt,auth,django,public' },
        },
        'audit_db': {
            **_db_base,
            'OPTIONS': { **_db_options, 'options': '-c search_path=audit,auth,django,public' },
        }
    }
    DATABASE_ROUTERS = ['config.routers.SchemaRouter']



# Auth
AUTH_USER_MODEL = 'users.User'

# Password Hashers
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptPasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]

# REST Framework & JWT settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# SimpleJWT settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    # Cookies seguras
    'AUTH_COOKIE': 'refresh_token',
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': 'Lax',
    'AUTH_COOKIE_DOMAIN': None,
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization
LANGUAGE_CODE = 'es-ec'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# CORS
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Allows all in dev; restrict in production
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
]

# SimpleJWT settings (already configured above)


# ─────────────────────────────────────────────────────────────────────────────
_redis_url = os.environ.get('REDIS_URL', 'redis://redis:6379/0')

# Cache backend
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': _redis_url,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django',
        'TIMEOUT': 300,  # 5 min default
    }
}

# Django Channels Layer (WebSockets / async)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [_redis_url],
        },
    }
}

# Session backend via Redis (opcional â€” reemplaza la de DB)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'


# â”€â”€â”€ Celery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CELERY_BROKER_URL        = os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/1')
CELERY_RESULT_BACKEND    = os.environ.get('CELERY_RESULT_BACKEND', 'redis://redis:6379/2')
CELERY_ACCEPT_CONTENT    = ['json']
CELERY_TASK_SERIALIZER   = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE          = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT   = 30 * 60  # 30 min hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 min soft limit

# django-celery-beat: usa DB para guardar schedules
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# django-celery-results: guarda resultados en la DB
CELERY_RESULT_EXTENDED = True

CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-tokens': {
        'task': 'cleanup_expired_tokens',
        'schedule': 86400.0,
    },
    'cleanup-inactive-sessions': {
        'task': 'cleanup_inactive_sessions',
        'schedule': 86400.0,
    },
    'cleanup-expired-password-reset-tokens': {
        'task': 'cleanup_expired_password_reset_tokens',
        'schedule': 86400.0,
    },
}
# ─── Email Settings ──────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('SMTP_HOST', 'smtp')
EMAIL_PORT = int(os.environ.get('SMTP_PORT', 25))
EMAIL_USE_TLS = os.environ.get('SMTP_USE_TLS', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('SMTP_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', os.environ.get('SMTP_USER', 'noreply@localhost'))

# Frontend URL for password reset links
FRONTEND_URL = os.environ.get('FRONTEND_URL')
if not FRONTEND_URL or "${FRONTEND_PORT}" in FRONTEND_URL:
    _server_ip = os.environ.get('SERVER_IP', 'localhost')
    if DEBUG:
        FRONTEND_URL = f"http://{_server_ip}:3000"
    else:
        FRONTEND_URL = f"https://{_server_ip}"
