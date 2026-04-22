import uuid
from django.db import models
from django.conf import settings


class JobType(models.TextChoices):
    FULL_TIME = 'full-time', 'Tiempo Completo'
    PART_TIME = 'part-time', 'Medio Tiempo'
    CONTRACT = 'contract', 'Contrato'
    REMOTE = 'remote', 'Remoto'


class JobStatus(models.TextChoices):
    DRAFT = 'draft', 'Borrador'
    OPEN = 'open', 'Abierta'
    CLOSED = 'closed', 'Cerrada'


class PipelineStage(models.TextChoices):
    APPLIED = 'applied', 'Aplicados'
    SCREENING = 'screening', 'Screening'
    INTERVIEW = 'interview', 'Entrevista'
    OFFER = 'offer', 'Oferta'
    HIRED = 'hired', 'Contratado'
    REJECTED = 'rejected', 'Rechazado'


class DocumentType(models.TextChoices):
    CV = 'cv', 'Currículum'
    PORTFOLIO = 'portfolio', 'Portafolio'
    CERTIFICATE = 'certificate', 'Certificado'
    ID = 'id', 'Identificación'
    OTHER = 'other', 'Otro'


class ActivityType(models.TextChoices):
    STAGE_CHANGE = 'stage_change', 'Cambio de Etapa'
    NOTE = 'note', 'Nota'
    MESSAGE = 'message', 'Mensaje'
    RATING_CHANGE = 'rating_change', 'Cambio de Calificación'
    APPLICATION = 'application', 'Aplicación'
    FORM_SUBMISSION = 'form_submission', 'Envío de Formulario'


class SentFormStatus(models.TextChoices):
    PENDING = 'pending', 'Pendiente'
    COMPLETED = 'completed', 'Completado'
    EXPIRED = 'expirado', 'Expirado'


class Job(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    department = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=100, blank=True)
    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        blank=True
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=10,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT
    )
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_jobs'
    )
    form = models.ForeignKey(
        'Form',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jobs'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'jobs'
        verbose_name = 'Vacante'
        verbose_name_plural = 'Vacantes'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255)
    phone = models.CharField(max_length=50, blank=True)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='candidates'
    )
    stage = models.CharField(
        max_length=20,
        choices=PipelineStage.choices,
        default=PipelineStage.APPLIED
    )
    resume_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(default=0)
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidates'
        verbose_name = 'Candidato'
        verbose_name_plural = 'Candidatos'
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.name} - {self.job.title}"


class CandidateDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    name = models.CharField(max_length=255)
    url = models.URLField()
    doc_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidate_documents'
        verbose_name = 'Documento de Candidato'
        verbose_name_plural = 'Documentos de Candidatos'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} ({self.get_doc_type_display()})"


class Activity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    type = models.CharField(
        max_length=30,
        choices=ActivityType.choices
    )
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_activities'
    )

    class Meta:
        db_table = 'activities'
        verbose_name = 'Actividad'
        verbose_name_plural = 'Actividades'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_display()}: {self.description[:50]}..."


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    subject = models.CharField(max_length=255)
    body = models.TextField()
    template = models.CharField(max_length=100, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_messages'
    )

    class Meta:
        db_table = 'messages'
        verbose_name = 'Mensaje'
        verbose_name_plural = 'Mensajes'
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.subject} - {self.candidate.name}"


class Form(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_forms'
    )

    class Meta:
        db_table = 'forms'
        verbose_name = 'Formulario'
        verbose_name_plural = 'Formularios'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class FormField(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='fields'
    )
    field_type = models.CharField(max_length=20)
    label = models.CharField(max_length=255)
    placeholder = models.CharField(max_length=255, blank=True)
    required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    validation = models.JSONField(default=dict, blank=True)
    help_text = models.TextField(blank=True)
    field_order = models.PositiveIntegerField(default=0)
    conditional_rules = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'form_fields'
        verbose_name = 'Campo de Formulario'
        verbose_name_plural = 'Campos de Formularios'
        ordering = ['field_order']

    def __str__(self):
        return f"{self.label} ({self.field_type})"


class FormChain(models.Model):
    from_form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='chained_forms',
        help_text='Formulario que redirige a otro'
    )
    to_form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='chained_from',
        help_text='Formulario destino'
    )

    class Meta:
        db_table = 'form_chains'
        verbose_name = 'Cadena de Formularios'
        verbose_name_plural = 'Cadenas de Formularios'
        unique_together = ['from_form', 'to_form']

    def __str__(self):
        return f"{self.from_form.name} → {self.to_form.name}"


class SentForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='sent_forms'
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='sent_forms'
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='sent_forms'
    )
    status = models.CharField(
        max_length=10,
        choices=SentFormStatus.choices,
        default=SentFormStatus.PENDING
    )
    token = models.CharField(max_length=64, unique=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'sent_forms'
        verbose_name = 'Formulario Enviado'
        verbose_name_plural = 'Formularios Enviados'
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.form.name} - {self.candidate.name} ({self.get_status_display()})"


class FormSubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='form_submissions'
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='form_submissions'
    )
    answers = models.JSONField(default=dict)
    file_data = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    chained_from_form = models.ForeignKey(
        Form,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chained_submissions'
    )
    chained_from_submission = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chained_responses'
    )

    class Meta:
        db_table = 'form_submissions'
        verbose_name = 'Respuesta de Formulario'
        verbose_name_plural = 'Respuestas de Formularios'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.form.name} - {self.candidate.name}"


class JobAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='job_assignments'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_jobs'
    )

    class Meta:
        db_table = 'job_assignments'
        verbose_name = 'Asignación de Vacante'
        verbose_name_plural = 'Asignaciones de Vacantes'
        unique_together = ['job', 'user']

    def __str__(self):
        return f"{self.user.email} → {self.job.title}"