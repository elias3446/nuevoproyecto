from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserManagerTests(TestCase):
    def test_create_user(self):
        """Prueba creación de usuario normal."""
        user = User.objects.create_user(
            email="test@example.com",
            password="password123"
        )
        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.check_password("password123"))
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)

    def test_create_superuser(self):
        """Prueba creación de superusuario."""
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="password123"
        )
        self.assertEqual(admin.email, "admin@example.com")
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)

    def test_user_is_active(self):
        """Verifica que los usuarios sean activos por defecto."""
        user = User.objects.create_user(email="active@example.com", password="pw")
        self.assertTrue(user.is_active)
