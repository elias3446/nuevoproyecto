from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        self.email = "user@example.com"
        self.password = "password123"
        self.register_url = reverse('auth_register')
        self.login_url = reverse('token_obtain_pair')
        self.logout_url = reverse('auth_logout')
        self.profile_url = reverse('user_profile')
        self.refresh_url = reverse('token_refresh')

    def test_01_api_root(self):
        """Verifica que la raíz de la API responde correctamente."""
        response = self.client.get(reverse('api-root'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('register', response.data)

    def test_02_register_user_success(self):
        """Prueba registro exitoso."""
        data = {'email': self.email, 'password': self.password}
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

    def test_03_register_duplicate_email(self):
        """Evita duplicados de email."""
        User.objects.create_user(email=self.email, password=self.password)
        data = {'email': self.email, 'password': self.password}
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_04_login_success(self):
        """Prueba login y obtención de tokens."""
        User.objects.create_user(email=self.email, password=self.password)
        data = {'email': self.email, 'password': self.password}
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_05_profile_access(self):
        """Prueba acceso al perfil con token."""
        user = User.objects.create_user(email=self.email, password=self.password)
        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.email)

    def test_06_profile_unauthorized(self):
        """Prueba que el perfil esté protegido."""
        response = self.client.get(self.profile_url)
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_07_token_refresh(self):
        """Prueba refresco de token."""
        User.objects.create_user(email=self.email, password=self.password)
        login_resp = self.client.post(self.login_url, {'email': self.email, 'password': self.password})
        refresh_token = login_resp.data['refresh']
        
        response = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_08_logout_blacklisting(self):
        """Prueba que el logout invalida el token."""
        user = User.objects.create_user(email=self.email, password=self.password)
        login_resp = self.client.post(self.login_url, {'email': self.email, 'password': self.password})
        refresh_token = login_resp.data['refresh']
        
        # Logout
        self.client.force_authenticate(user=user)
        logout_resp = self.client.post(self.logout_url, {'refresh': refresh_token})
        self.assertEqual(logout_resp.status_code, status.HTTP_205_RESET_CONTENT)
        
        # Intentar refrescar con el token invalidado debe fallar
        refresh_retry = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(refresh_retry.status_code, status.HTTP_401_UNAUTHORIZED)
