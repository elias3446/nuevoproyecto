import logging
import urllib.request
import json
from typing import Optional
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from .models import UserSession, UserLoginActivity
from .redis_manager import RedisSessionManager
from audit.models import AccessLog, AuditAction

logger = logging.getLogger(__name__)

# Tiempos de expiración (pueden venir de settings)
SESSION_TIMEOUT = 86400 * 30  # 30 días


def get_client_ip(request) -> str:
    """Extrae la IP real del cliente manejando proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    remote_addr = request.META.get('REMOTE_ADDR')
    
    if x_forwarded_for:
        ips = [ip.strip() for ip in x_forwarded_for.split(',')]
        # Retornamos la primera IP de la lista (el cliente real según el proxy)
        return ips[0]
        
    return remote_addr or '127.0.0.1'


def parse_user_agent(request) -> dict:
    """Parsea el User-Agent y retorna info del dispositivo."""
    ua = request.META.get('HTTP_USER_AGENT', '')
    
    device_info = {
        'browser': 'Unknown',
        'os': 'Unknown',
        'device': 'Desktop',
        'raw': ua,
    }
    
    ua_lower = ua.lower()
    
    if 'firefox' in ua_lower:
        device_info['browser'] = 'Firefox'
    elif 'chrome' in ua_lower and 'edg' not in ua_lower:
        device_info['browser'] = 'Chrome'
    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
        device_info['browser'] = 'Safari'
    elif 'edg' in ua_lower:
        device_info['browser'] = 'Edge'
    elif 'opera' in ua_lower or 'opr' in ua_lower:
        device_info['browser'] = 'Opera'
    
    if 'android' in ua_lower:
        device_info['os'] = 'Android'
    elif 'ios' in ua_lower or 'iphone' in ua_lower or 'ipad' in ua_lower:
        device_info['os'] = 'iOS'
    elif 'windows' in ua_lower:
        device_info['os'] = 'Windows'
    elif 'mac os' in ua_lower or 'macos' in ua_lower:
        device_info['os'] = 'macOS'
    elif 'linux' in ua_lower:
        device_info['os'] = 'Linux'
    
    if 'mobile' in ua_lower or 'android' in ua_lower or 'iphone' in ua_lower:
        device_info['device'] = 'Mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        device_info['device'] = 'Tablet'
    
    return device_info


def get_geolocation(ip: str) -> dict:
    """Retorna geolocalización real usando ip-api.com."""
    if ip in ('127.0.0.1', 'localhost', '', '::1') or ip.startswith(('192.168.', '10.', '172.17.', '172.18.')):
        return {'country': 'EC', 'city': 'Local'}
    
    try:
        # Usamos urllib para no añadir dependencias como 'requests'
        url = f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,regionName,city,isp,proxy,vpn,query"
        with urllib.request.urlopen(url, timeout=2) as response:
            data = json.loads(response.read().decode())
            if data.get('status') == 'success':
                return {
                    'country': data.get('country', 'Unknown'),
                    'country_code': data.get('countryCode', 'XX'),
                    'state': data.get('regionName', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'isp': data.get('isp', 'Unknown'),
                    'is_proxy': data.get('proxy', False),
                    'is_vpn': data.get('vpn', False),
                }
    except Exception as e:
        logger.error(f"Error en geolocalización para IP {ip}: {e}")
        
    return {
        'country': 'Unknown', 
        'country_code': 'XX', 
        'state': 'Unknown', 
        'city': 'Unknown',
        'isp': 'Unknown',
        'is_proxy': False,
        'is_vpn': False,
        'risk_score': 0
    }


def is_device_info_valid(device_info: dict) -> bool:
    """Valida que device_info tenga datos confiables."""
    if not device_info:
        return False
    browser = device_info.get('browser', '')
    os = device_info.get('os', '')
    return browser not in ('Unknown', '') and os not in ('Unknown', '')


def calculate_risk_level(
    user,
    new_login_data: dict,
    history: list = None
) -> tuple[str, dict]:
    """
    Calcula el nivel de riesgo del login.
    Returns: (risk_level, details)
    """
    details = {
        'reason': '',
        'new_ip': False,
        'new_country': False,
        'new_device': False,
        'suspicious_activity': False,
    }
    
    new_ip = new_login_data.get('ip_address', '')
    new_country = new_login_data.get('country', '')
    new_device = new_login_data.get('device_info', {})
    
    if history is None:
        history = list(
            UserLoginActivity.objects.filter(user=user, success=True)
            .order_by('-created_at')[:10]
        )
    
    if not history:
        return 'low', {**details, 'reason': 'Primer inicio de sesión'}
    
    history_ips = set(h.ip_address for h in history if h.ip_address)
    history_countries = set(h.country for h in history if h.country)
    history_devices = set(
        f"{d.get('browser')}-{d.get('os')}" 
        for h in history 
        if (d := h.device_info)
    )
    
    new_device_key = f"{new_device.get('browser')}-{new_device.get('os')}"
    
    if new_ip and new_ip not in history_ips:
        details['new_ip'] = True
    
    if new_country and new_country not in history_countries:
        details['new_country'] = True
    
    if new_device_key and new_device_key not in history_devices:
        details['new_device'] = True
    
    active_sessions = UserSession.objects.filter(
        user=user, 
        is_active=True
    ).count()
    
    if details['new_country'] and details['new_country'] != 'XX':
        return 'high', {**details, 'reason': 'Login desde nuevo país'}
    
    if active_sessions >= 5:
        details['suspicious_activity'] = True
        if details['new_device'] or details['new_ip']:
            return 'high', {**details, 'reason': f'{active_sessions} dispositivos activos'}
        return 'medium', {**details, 'reason': f'{active_sessions} dispositivos activos'}
    
    if details['new_ip'] and details['new_country']:
        return 'medium', {**details, 'reason': f'Nueva IP en {new_country}'}
    
    if details['new_ip']:
        return 'medium', {**details, 'reason': 'Nueva IP detectada'}
    
    if details['new_device']:
        return 'medium', {**details, 'reason': 'Nuevo dispositivo'}
    
    return 'low', {**details, 'reason': 'Login normal'}


def register_login_activity(
    user,
    ip_address: str,
    device_info: dict,
    country: str,
    city: str,
    success: bool,
    risk_level: str,
    country_code: str = '',
    state: str = '',
    isp: str = '',
    is_vpn: bool = False,
    is_proxy: bool = False,
    risk_score: int = 0
) -> UserLoginActivity:
    """Registra un intento de login en el historial."""
    activity = UserLoginActivity.objects.create(
        user=user,
        ip_address=ip_address,
        country=country,
        country_code=country_code,
        city=city,
        state=state,
        isp=isp,
        is_vpn=is_vpn,
        is_proxy=is_proxy,
        risk_score=risk_score,
        user_agent=device_info.get('raw', ''),
        device_info=device_info,
        success=success,
        risk_level=risk_level,
    )
    
    # También registrar en AccessLog para centralizar auditoría de accesos
    if success:
        AccessLog.objects.create(
            user=user,
            action=AuditAction.LOGIN,
            ip_address=ip_address,
            user_agent=device_info.get('raw', ''),
            device_info=device_info,
            country=country,
            country_code=country_code,
            city=city,
            state=state,
            reason=f"Login exitoso - Nivel de riesgo: {risk_level}"
        )
    
    return activity


def create_user_session(
    user,
    refresh_token_jti: str,
    ip_address: str,
    device_info: dict,
    country: str,
    city: str,
    is_suspicious: bool = False,
    country_code: str = '',
    state: str = '',
    isp: str = '',
    is_vpn: bool = False,
    is_proxy: bool = False,
    risk_score: int = 0
) -> UserSession:
    """Crea una nueva sesión de usuario."""
    UserSession.objects.filter(user=user, is_current=True).update(is_current=False)
    
    session = UserSession.objects.create(
        user=user,
        refresh_token_jti=refresh_token_jti,
        device_info=device_info,
        ip_address=ip_address,
        country=country,
        country_code=country_code,
        city=city,
        state=state,
        isp=isp,
        is_vpn=is_vpn,
        is_proxy=is_proxy,
        risk_score=risk_score,
        user_agent=device_info.get('raw', ''),
        is_current=True,
        is_suspicious=is_suspicious,
    )
    
    # 2. Persistir en Redis (Capa de persistencia rápida)
    session_data = {
        "id": session.id,
        "user_id": str(user.id),
        "ip_address": ip_address,
        "device_info": device_info,
        "location": f"{city}, {country}",
        "is_suspicious": is_suspicious,
        "created_at": str(timezone.now()),
    }
    RedisSessionManager.create_session(str(session.id), str(user.id), session_data)
    
    return session


def invalidate_session(jti: str) -> bool:
    """Invalida una sesión por JTI."""
    try:
        session = UserSession.objects.get(refresh_token_jti=jti, is_active=True)
        session.is_active = False
        session.save()
        # Sincronizar con Redis Manager
        RedisSessionManager.revoke_session(str(session.id), str(session.user.id))
        return True
    except UserSession.DoesNotExist:
        return False


def update_session_jti(user, old_jti: str, new_jti: str) -> bool:
    """
    Actualiza el JTI de una sesión activa del usuario.
    Primero intenta buscar por old_jti, y si falla, busca la sesión activa más reciente.
    """
    try:
        # Intento 1: Por el ID exacto que teníamos
        session = UserSession.objects.get(refresh_token_jti=old_jti, user=user, is_active=True)
        session.refresh_token_jti = new_jti
        session.save()
        return True
    except UserSession.DoesNotExist:
        # Intento 2: Buscar la sesión activa más reciente del usuario (fallback)
        session = UserSession.objects.filter(user=user, is_active=True).order_by('-last_used').first()
        if session:
            session.refresh_token_jti = new_jti
            session.save()
            return True
    return False


def invalidate_all_user_sessions(user) -> int:
    """Invalida todas las sesiones de un usuario."""
    # 1. Invalida en Redis de forma atómica (rápido)
    RedisSessionManager.revoke_all_user_sessions(str(user.id))
    
    # 2. Invalida en DB (para historial)
    count = UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
    return count


def invalidate_all_user_tokens(user) -> int:
    """Invalida todos los refresh tokens del usuario."""
    return invalidate_all_user_sessions(user)


def get_active_sessions(user):
    """
    Retorna el QuerySet de sesiones activas del usuario.
    """
    from .models import UserSession
    return UserSession.objects.filter(user=user, is_active=True).order_by('-last_used')