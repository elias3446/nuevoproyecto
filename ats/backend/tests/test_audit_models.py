from django.test import TestCase
from django.contrib.auth import get_user_model
from audit.models import AuditLog, AccessLog, AuditAction
import uuid

User = get_user_model()

class AuditModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="auditor@example.com",
            password="password123"
        )
        self.record_id = uuid.uuid4()

    def test_audit_log_creation(self):
        """Verifica que se pueden registrar cambios en registros."""
        log = AuditLog.objects.create(
            user=self.user,
            action=AuditAction.UPDATE,
            table_name="jobs",
            record_id=self.record_id,
            old_values={"status": "draft"},
            new_values={"status": "open"}
        )
        self.assertEqual(log.action, AuditAction.UPDATE)
        self.assertEqual(log.table_name, "jobs")
        self.assertEqual(log.old_values["status"], "draft")
        self.assertIn(f"UPDATE on jobs by {self.user.email}", str(log))

    def test_access_log_creation(self):
        """Verifica que se pueden registrar accesos a recursos."""
        log = AccessLog.objects.create(
            user=self.user,
            action="Acceso a Vacante",
            resource_type="job",
            resource_id=self.record_id,
            ip_address="127.0.0.1",
            reason="Consulta de detalles"
        )
        self.assertEqual(log.resource_type, "job")
        self.assertEqual(log.ip_address, "127.0.0.1")
        self.assertIn("Acceso a Vacante", str(log))
