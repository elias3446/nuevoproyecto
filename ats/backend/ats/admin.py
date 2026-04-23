from django.contrib import admin
from .models import (
    Job, Candidate, CandidateDocument, Activity, Message,
    Form, FormField, FormChain, SentForm, FormSubmission, JobAssignment
)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'location', 'job_type', 'status', 'created_at']
    list_filter = ['status', 'job_type', 'department']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'job', 'stage', 'rating', 'applied_at']
    list_filter = ['stage', 'job']
    search_fields = ['name', 'email', 'phone']
    ordering = ['-applied_at']
    date_hierarchy = 'applied_at'


@admin.register(CandidateDocument)
class CandidateDocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'candidate', 'doc_type', 'uploaded_at']
    list_filter = ['doc_type']
    search_fields = ['name', 'candidate__name']
    ordering = ['-uploaded_at']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'type', 'description', 'created_at', 'created_by']
    list_filter = ['type']
    search_fields = ['description', 'candidate__name']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['subject', 'candidate', 'sent_at', 'sent_by']
    search_fields = ['subject', 'body', 'candidate__name']
    ordering = ['-sent_at']
    date_hierarchy = 'sent_at'


@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_template', 'created_at', 'created_by']
    list_filter = ['is_template']
    search_fields = ['name', 'description']
    ordering = ['-created_at']


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ['label', 'form', 'field_type', 'field_order', 'required']
    list_filter = ['field_type']
    search_fields = ['label', 'form__name']
    ordering = ['form', 'field_order']


@admin.register(FormChain)
class FormChainAdmin(admin.ModelAdmin):
    list_display = ['from_form', 'to_form']
    search_fields = ['from_form__name', 'to_form__name']


@admin.register(SentForm)
class SentFormAdmin(admin.ModelAdmin):
    list_display = ['form', 'candidate', 'job', 'status', 'sent_at', 'expires_at']
    list_filter = ['status']
    search_fields = ['form__name', 'candidate__name']
    ordering = ['-sent_at']
    date_hierarchy = 'sent_at'


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ['form', 'candidate', 'job', 'submitted_at']
    list_filter = ['form']
    search_fields = ['form__name', 'candidate__name']
    ordering = ['-submitted_at']
    date_hierarchy = 'submitted_at'


@admin.register(JobAssignment)
class JobAssignmentAdmin(admin.ModelAdmin):
    list_display = ['job', 'user', 'assigned_at', 'assigned_by']
    list_filter = ['job']
    search_fields = ['job__title', 'user__email']
    ordering = ['-assigned_at']