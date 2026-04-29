from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='cleanup_expired_tokens')
def cleanup_expired_tokens():
    """
    Elimina tokens expirados de la blacklist y outstanding tokens.
    Se ejecuta diariamente via Celery Beat.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        GRACE_PERIOD = timedelta(days=2)
        cutoff = timezone.now() - GRACE_PERIOD
        
        outstanding_count = OutstandingToken.objects.filter(
            expires_at__lt=cutoff
        ).delete()[0]
        
        blacklisted_count = BlacklistedToken.objects.filter(
            token__expires_at__lt=cutoff
        ).delete()[0]
        
        total = outstanding_count + blacklisted_count
        logger.info(f"Cleanup: eliminados {total} tokens expirados")
        
        return f"Eliminados {total} tokens expirados"
    except Exception as e:
        logger.error(f"Error en cleanup_expired_tokens: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='cleanup_inactive_sessions')
def cleanup_inactive_sessions():
    """
    Cleanup sesiones de usuario inactivas por más de 30 días.
    Se ejecuta diariamente via Celery Beat.
    """
    try:
        from .models import UserSession
        
        GRACE_PERIOD = timedelta(days=30)
        cutoff = timezone.now() - GRACE_PERIOD
        
        inactive_count = UserSession.objects.filter(
            last_used__lt=cutoff,
            is_active=True
        ).update(is_active=False)
        
        logger.info(f"Cleanup: {inactive_count} sesiones marcadas como inactivas")
        
        return f"{inactive_count} sesiones inactivas limpiadas"
    except Exception as e:
        logger.error(f"Error en cleanup_inactive_sessions: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='revoke_session_token_task')
def revoke_session_token_task(session_id: int):
    """
    Tarea asíncrona para invalidar una sesión y poner su token en la Blacklist.
    Redis actúa como broker para esta solicitud.
    """
    try:
        from .models import UserSession
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        session = UserSession.objects.get(id=session_id)
        jti = session.refresh_token_jti
        
        # 1. Marcar sesión como inactiva
        session.is_active = False
        session.save()
        
        # 2. Blacklist el token si existe en OutstandingTokens
        if jti:
            try:
                token = OutstandingToken.objects.get(jti=jti)
                BlacklistedToken.objects.get_or_create(token=token)
                logger.info(f"Token {jti} añadido a la blacklist exitosamente")
            except OutstandingToken.DoesNotExist:
                logger.warning(f"No se encontró el token outstanding para JTI {jti}")
        
        return f"Sesión {session_id} revocada y token invalidado"
        
    except UserSession.DoesNotExist:
        logger.error(f"Error: Sesión {session_id} no encontrada para revocar")
        return "Sesión no encontrada"
    except Exception as e:
        logger.error(f"Error en revoke_session_token_task: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='send_welcome_email_task')
def send_welcome_email_task(user_email: str, user_name: str = ''):
    """
    Envía un correo de bienvenida al usuario recién creado.
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = 'Bienvenido a la plataforma ATS'
        message = f'Hola {user_name or user_email},\n\nTu cuenta ha sido creada exitosamente.\nYa puedes acceder a la plataforma con tu correo electrónico: {user_email}\n\nSaludos,\nEl equipo de ATS.'
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            fail_silently=False,
        )
        logger.info(f"Correo de bienvenida enviado a {user_email}")
        return f"Correo enviado a {user_email}"
    except Exception as e:
        logger.error(f"Error enviando correo de bienvenida a {user_email}: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='complete_user_registration_task')
def complete_user_registration_task(user_id: str, ip_address: str, user_agent: str = ''):
    """
    Finaliza el registro de usuario de forma asíncrona:
    1. Geocalización de la IP de registro.
    2. Auditoría.
    3. Calentamiento de caché en Redis.
    """
    try:
        from django.contrib.auth import get_user_model
        from .utils import get_geolocation
        from audit.models import AuditLog
        from django.core.cache import cache
        
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # 1. Enriquecimiento con Geolocalización
        geo = get_geolocation(ip_address)
        user.raw_user_meta_data = user.raw_user_meta_data or {}
        user.raw_user_meta_data.update({
            'registration_ip': ip_address,
            'registration_geo': geo,
            'registration_ua': user_agent
        })
        user.save()
        
        # 2. Registro de Auditoría
        AuditLog.objects.create(
            user=user,
            action='INSERT',
            table_name='auth.users',
            record_id=str(user.id),
            new_values={
                'email': user.email,
                'registration_ip': ip_address,
                'location': f"{geo.get('city')}, {geo.get('country')}"
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # 3. Calentamiento de Caché (Redis)
        # Guardamos datos básicos del perfil para que la primera carga sea instantánea
        cache_key = f"user_profile_lite:{user_id}"
        cache.set(cache_key, {
            'email': user.email,
            'is_active': user.is_active,
            'location': geo.get('country_code', 'XX')
        }, timeout=3600)
        
        logger.info(f"Registro completado asíncronamente para usuario: {user.email}")
        return f"Usuario {user_id} enriquecido y auditado"
        
    except Exception as e:
        logger.error(f"Error en complete_user_registration_task para {user_id}: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='cleanup_expired_password_reset_tokens')
def cleanup_expired_password_reset_tokens():
    """
    Elimina tokens de recuperación de contraseña expirados o usados.
    Se ejecuta diariamente via Celery Beat.
    """
    try:
        from .models import PasswordResetToken
        from django.utils import timezone

        expired_count = PasswordResetToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]

        used_count = PasswordResetToken.objects.filter(
            used=True,
            created_at__lt=timezone.now() - timedelta(days=7)
        ).delete()[0]

        total = expired_count + used_count
        logger.info(f"Cleanup: eliminados {total} tokens de recuperación de contraseña")

        return f"Eliminados {total} tokens de recuperación"
    except Exception as e:
        logger.error(f"Error en cleanup_expired_password_reset_tokens: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='notify_password_change_task')
def notify_password_change_task(user_id: str, ip_address: str, user_agent: str = ''):
    """
    Notifica al usuario y audita el cambio de contraseña.
    """
    try:
        from django.contrib.auth import get_user_model
        from audit.models import AuditLog
        from django.core.mail import send_mail
        from django.conf import settings
        
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # 1. Registro de Auditoría
        AuditLog.objects.create(
            user=user,
            action='UPDATE',
            table_name='auth.users',
            record_id=str(user.id),
            new_values={'action': 'password_change', 'ip': ip_address},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # 2. Notificación por Correo
        subject = 'Tu contraseña ha sido cambiada - ATS'
        message = f'Hola,\n\nTe informamos que la contraseña de tu cuenta en ATS ha sido actualizada exitosamente.\n\nSi no realizaste este cambio, por favor contacta a soporte de inmediato.\n\nDetalles del cambio:\nIP: {ip_address}\nDispositivo: {user_agent}\n\nSaludos,\nEl equipo de ATS.'
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=True,
        )
        
        logger.info(f"Notificación de cambio de contraseña enviada para {user.email}")
        return f"Notificación enviada para {user_id}"
        
    except Exception as e:
        logger.error(f"Error en notify_password_change_task: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(name='send_password_reset_email_task')
def send_password_reset_email_task(user_email: str, reset_url: str):
    """
    Envía el correo con el enlace de recuperación de contraseña.
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = 'Recuperación de Contraseña - ATS'
        message = f'''
Hola,

Has solicitado recuperar tu contraseña en ATS. Haz clic en el siguiente enlace para crear una nueva contraseña:

{reset_url}

Este enlace expira en 15 minutos y solo puede usarse una vez.

Si no solicitaste este cambio, puedes ignorar este correo de forma segura.

Saludos,
El equipo de ATS.
'''
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            fail_silently=False,
        )
        logger.info(f"Correo de recuperación enviado a {user_email}")
        return f"Email enviado a {user_email}"
    except Exception as e:
        logger.error(f"Error enviando email de recuperación a {user_email}: {str(e)}")
        return f"Error: {str(e)}"