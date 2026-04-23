from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from users.models import UserSession, UserLoginActivity

User = get_user_model()


class SessionSecurityTests(APITestCase):
    def setUp(self):
        self.email = "test@example.com"
        self.password = "password123"
        self.user = User.objects.create_user(email=self.email, password=self.password)
        
        self.login_url = reverse('token_obtain_pair')
        self.logout_url = reverse('auth_logout')
        self.sessions_url = reverse('user_sessions')
        self.logout_all_url = reverse('logout_all_devices')

    def test_01_login_creates_session(self):
        """El login crea una sesión de usuario."""
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        sessions = UserSession.objects.filter(user=self.user, is_active=True)
        self.assertEqual(sessions.count(), 1)
        
        session = sessions.first()
        self.assertEqual(session.ip_address, '127.0.0.1')

    def test_02_login_creates_login_activity(self):
        """El login registra actividad."""
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        activities = UserLoginActivity.objects.filter(user=self.user)
        self.assertEqual(activities.count(), 1)
        
        activity = activities.first()
        self.assertTrue(activity.success)
        self.assertIn(activity.risk_level, ['low', 'medium', 'high', 'critical'])

    def test_03_login_returns_risk_level(self):
        """El login retorna el nivel de riesgo."""
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn('risk_level', response.data)

    def test_04_sessions_endpoint_requires_auth(self):
        """El endpoint de sesiones requiere autenticación."""
        response = self.client.get(self.sessions_url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_05_sessions_lists_active_sessions(self):
        """Lista las sesiones activas."""
        self.client.force_authenticate(user=self.user)
        
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='test-jti-1',
            ip_address='192.168.1.1',
            is_current=True
        )
        
        response = self.client.get(self.sessions_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_06_logout_invalidates_session(self):
        """El logout invalida la sesión."""
        session = UserSession.objects.create(
            user=self.user,
            refresh_token_jti='test-jti-logout',
            ip_address='192.168.1.1',
            is_current=True
        )
        
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        refresh_token = response.data['refresh']
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.logout_url, {'refresh': refresh_token})
        
        # Obtenemos la sesión real creada por el login y verificamos que esté inactiva
        # Usamos decode sin verificar para evitar TokenError si el token ya está blacklisted
        from jwt import decode
        payload = decode(refresh_token, options={"verify_signature": False})
        jti = payload.get('jti')
        login_session = UserSession.objects.get(refresh_token_jti=jti)
        self.assertFalse(login_session.is_active)

    def test_07_logout_all_devices(self):
        """Cierra todas las sesiones del usuario."""
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='test-jti-1',
            ip_address='192.168.1.1',
            is_current=True
        )
        UserSession.objects.create(
            user=self.user,
            refresh_token_jti='test-jti-2',
            ip_address='192.168.1.2',
            is_current=False
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.logout_all_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        active_sessions = UserSession.objects.filter(user=self.user, is_active=True)
        self.assertEqual(active_sessions.count(), 0)

    def test_08_first_login_is_low_risk(self):
        """Primer login tiene riesgo bajo."""
        UserSession.objects.all().delete()
        UserLoginActivity.objects.all().delete()
        
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        activity = UserLoginActivity.objects.filter(user=self.user).first()
        self.assertEqual(activity.risk_level, 'low')


class RememberMeTests(APITestCase):
    def setUp(self):
        self.email = "remember@example.com"
        self.password = "password123"
        self.user = User.objects.create_user(email=self.email, password=self.password)
        
        self.login_url = reverse('token_obtain_pair')

    def test_01_login_without_remember_me(self):
        """Login sin remember_me no.setCookie."""
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn('access', response.data)
        
        cookies = response.cookies
        self.assertNotIn('refresh_token', cookies)

    def test_02_login_with_remember_me_sets_cookie(self):
        """Login con remember_me.setCookie HttpOnly."""
        response = self.client.post(self.login_url, {
            'email': self.email,
            'password': self.password,
            'remember_me': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        cookies = response.cookies
        self.assertIn('refresh_token', cookies)
        
        cookie = cookies['refresh_token']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')


class SessionCleanupTests(APITestCase):
    def setUp(self):
        self.email = "cleanup@example.com"
        self.password = "password123"
        self.user = User.objects.create_user(email=self.email, password=self.password)

    def test_01_cleanup_inactive_sessions_task(self):
        """La task de cleanup marca sesiones inactivas."""
        from users.tasks import cleanup_inactive_sessions
        from django.utils import timezone
        from datetime import timedelta
        
        session1 = UserSession.objects.create(
            user=self.user,
            refresh_token_jti='old-jti',
            ip_address='192.168.1.1',
            is_active=True
        )
        
        # Usamos .update para evitar que auto_now de last_used se actualice al guardar
        UserSession.objects.filter(pk=session1.pk).update(
            last_used=timezone.now() - timedelta(days=31)
        )
        
        result = cleanup_inactive_sessions()
        
        session1.refresh_from_db()
        self.assertFalse(session1.is_active)