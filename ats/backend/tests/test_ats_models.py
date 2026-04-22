from django.test import TestCase
from django.contrib.auth import get_user_model
from ats.models import Job, Candidate, Form, FormField, JobStatus, PipelineStage
import uuid

User = get_user_model()

class AtsModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="recruiter@example.com",
            password="password123"
        )
        self.form = Form.objects.create(
            name="Solicitud Estándar",
            created_by=self.user
        )
        self.job = Job.objects.create(
            title="Desarrollador Python",
            description="Buscamos experto en Django",
            status=JobStatus.OPEN,
            created_by=self.user,
            form=self.form
        )

    def test_job_creation(self):
        """Verifica la creación de una vacante."""
        self.assertEqual(self.job.title, "Desarrollador Python")
        self.assertEqual(self.job.status, JobStatus.OPEN)
        self.assertEqual(str(self.job), "Desarrollador Python")

    def test_candidate_creation(self):
        """Verifica la creación de un candidato vinculado a una vacante."""
        candidate = Candidate.objects.create(
            name="Juan Pérez",
            email="juan@example.com",
            job=self.job,
            stage=PipelineStage.APPLIED
        )
        self.assertEqual(candidate.name, "Juan Pérez")
        self.assertEqual(candidate.job, self.job)
        self.assertEqual(candidate.stage, PipelineStage.APPLIED)
        self.assertEqual(str(candidate), f"Juan Pérez - {self.job.title}")

    def test_form_and_fields(self):
        """Verifica formularios y sus campos."""
        field = FormField.objects.create(
            form=self.form,
            label="¿Por qué quieres trabajar con nosotros?",
            field_type="textarea",
            required=True
        )
        self.assertEqual(self.form.name, "Solicitud Estándar")
        self.assertEqual(self.form.fields.count(), 1)
        self.assertEqual(field.label, "¿Por qué quieres trabajar con nosotros?")
        self.assertTrue(field.required)
