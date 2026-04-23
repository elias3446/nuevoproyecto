from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from users.models import UserSession, UserLoginActivity
from users.utils import (
    get_client_ip,
    parse_user_agent,
    calculate_risk_level,
    get_active_sessions,
    invalidate_all_user_sessions,
)

User = get_user_model()


class UtilsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(email='utils@example.com', password='password123')

    def test_01_get_client_ip_from_request(self):
        """Extrae IP del request."""
        request = self.factory.get('/', HTTP_X_FORWARDED_FOR='192.168.1.100, 10.0.0.1')
        ip = get_client_ip(request)
        self.assertEqual(ip, '192.168.1.100')

    def test_02_get_client_ip_fallback(self):
        """Usa REMOTE_ADDR si no hay forwarded."""
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = '192.168.1.1'
        ip = get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')

    def test_03_parse_chrome_user_agent(self):
        """Parsea Chrome correctamente."""
        request = self.factory.get('/', HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        info = parse_user_agent(request)
        
        self.assertEqual(info['browser'], 'Chrome')
        self.assertEqual(info['os'], 'Windows')
        self.assertEqual(info['device'], 'Desktop')

    def test_04_parse_firefox_user_agent(self):
        """Parsea Firefox correctamente."""
        request = self.factory.get('/', HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0')
        info = parse_user_agent(request)
        
        self.assertEqual(info['browser'], 'Firefox')
        self.assertEqual(info['os'], 'Windows')

    def test_05_parse_mobile_user_agent(self):
        """Detecta dispositivos móviles."""
        request = self.factory.get('/', HTTP_USER_AGENT='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        info = parse_user_agent(request)
        
        self.assertEqual(info['os'], 'iOS')
        self.assertEqual(info['device'], 'Mobile')


class RiskCalculationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='risk@example.com', password='password123')

    def test_01_first_login_is_low_risk(self):
        """Sin historial, el riesgo es bajo."""
        risk, details = calculate_risk_level(self.user, {
            'ip_address': '192.168.1.1',
            'country': 'EC',
            'device_info': {'browser': 'Chrome', 'os': 'Windows'}
        }, [])
        
        self.assertEqual(risk, 'low')

    def test_02_same_ip_same_device_is_low_risk(self):
        """Mismo IP y dispositivo es riesgo bajo."""
        history = [
            type('obj', (object,), {
                'ip_address': '192.168.1.1',
                'country': 'EC',
                'device_info': {'browser': 'Chrome', 'os': 'Windows'}
            })()
        ]
        
        risk, details = calculate_risk_level(self.user, {
            'ip_address': '192.168.1.1',
            'country': 'EC',
            'device_info': {'browser': 'Chrome', 'os': 'Windows'}
        }, history)
        
        self.assertEqual(risk, 'low')
        self.assertFalse(details['new_ip'])

    def test_03_new_ip_same_country_is_medium_risk(self):
        """Nueva IP en mismo país es riesgo medio."""
        history = [
            type('obj', (object,), {
                'ip_address': '192.168.1.1',
                'country': 'EC',
                'device_info': {'browser': 'Chrome', 'os': 'Windows'}
            })()
        ]
        
        risk, details = calculate_risk_level(self.user, {
            'ip_address': '192.168.1.50',
            'country': 'EC',
            'device_info': {'browser': 'Chrome', 'os': 'Windows'}
        }, history)
        
        self.assertEqual(risk, 'medium')
        self.assertTrue(details['new_ip'])

    def test_04_new_country_is_high_risk(self):
        """Nuevo país es riesgo alto."""
        history = [
            type('obj', (object,), {
                'ip_address': '192.168.1.1',
                'country': 'EC',
                'device_info': {'browser': 'Chrome', 'os': 'Windows'}
            })()
        ]
        
        risk, details = calculate_risk_level(self.user, {
            'ip_address': '8.8.8.8',
            'country': 'US',
            'device_info': {'browser': 'Chrome', 'os': 'Windows'}
        }, history)
        
        self.assertEqual(risk, 'high')
        self.assertTrue(details['new_country'])


class SessionManagementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='session@example.com', password='password123')

    def test_01_get_active_sessions(self):
        """Lista sesiones activas."""
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='active-1',
            ip_address='192.168.1.1',
            is_active=True
        )
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='inactive-1',
            ip_address='192.168.1.2',
            is_active=False
        )
        
        sessions = get_active_sessions(self.user)
        
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]['ip_address'], '192.168.1.1')

    def test_02_invalidate_all_sessions(self):
        """Invalida todas las sesiones."""
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='session-1',
            ip_address='192.168.1.1',
            is_active=True
        )
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='session-2',
            ip_address='192.168.1.2',
            is_active=True
        )
        
        count = invalidate_all_user_sessions(self.user)
        
        self.assertEqual(count, 2)
        
        active = UserSession.objects.filter(user=self.user, is_active=True)
        self.assertEqual(active.count(), 0)