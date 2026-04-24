import logging
from typing import Optional
from datetime import timedelta
from django.utils import timezone
from .models import UserSession, UserLoginActivity

logger = logging.getLogger(__name__)


def get_client_ip(request) -> str:
    """Extrae la IP real del cliente."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip or '127.0.0.1'


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
    """Retorna geolocalización básica. En producción usar API externa."""
    if ip in ('127.0.0.1', 'localhost', '', '::1'):
        return {'country': 'EC', 'city': 'Local'}
    
    # Detectar redes locales (Docker, redes privadas)
    if ip.startswith(('172.', '192.168.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.')):
        return {'country': 'XX', 'city': 'Local'}
    
    return {'country': 'XX', 'city': 'Unknown'}


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
    risk_level: str
) -> UserLoginActivity:
    """Registra un intento de login en el historial."""
    return UserLoginActivity.objects.create(
        user=user,
        ip_address=ip_address,
        country=country,
        city=city,
        user_agent=device_info.get('raw', ''),
        device_info=device_info,
        success=success,
        risk_level=risk_level,
    )


def create_user_session(
    user,
    refresh_token_jti: str,
    ip_address: str,
    device_info: dict,
    country: str,
    city: str,
    is_suspicious: bool = False
) -> UserSession:
    """Crea una nueva sesión de usuario."""
    UserSession.objects.filter(user=user, is_current=True).update(is_current=False)
    
    return UserSession.objects.create(
        user=user,
        refresh_token_jti=refresh_token_jti,
        device_info=device_info,
        ip_address=ip_address,
        country=country,
        city=city,
        user_agent=device_info.get('raw', ''),
        is_current=True,
        is_suspicious=is_suspicious,
    )


def invalidate_session(jti: str) -> bool:
    """Invalida una sesión por JTI."""
    try:
        session = UserSession.objects.get(refresh_token_jti=jti, is_active=True)
        session.is_active = False
        session.save()
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
    return UserSession.objects.filter(
        user=user, 
        is_active=True
    ).update(is_active=False)


def invalidate_all_user_tokens(user) -> int:
    """Invalida todos los refresh tokens del usuario."""
    return UserSession.objects.filter(
        user=user, 
        is_active=True
    ).update(
        is_active=False
    )


def get_active_sessions(user, current_user_agent: str = None) -> list:
    """
    Retorna las sesiones activas del usuario.
    Si se proporciona current_user_agent, se usa para validar is_current.
    """
    sessions = list(
        UserSession.objects.filter(user=user, is_active=True)
        .values(
            'id',
            'device_info',
            'ip_address',
            'country',
            'city',
            'user_agent',
            'is_current',
            'is_suspicious',
            'last_used',
            'created_at',
        )
    )
    
    # Si se proporciona user-agent actual, verificar重合
    if current_user_agent:
        for session in sessions:
            # La sesión es actual si coincide con el user-agent
            session_user_agent = session.get('user_agent', '')
            session['is_current'] = (session_user_agent == current_user_agent)
            # También marcar como sospechoso si los datos no son válidos
            device_info = session.get('device_info', {})
            if device_info and not is_device_info_valid(device_info):
                session['is_suspicious'] = True
    
    return sessions