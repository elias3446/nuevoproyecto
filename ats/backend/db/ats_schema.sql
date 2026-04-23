-- ============================================
-- ESQUEMA ATS: ROLES, PERMISOS Y DATOS
-- ============================================
-- Este archivo contiene el esquema completo para el sistema ATS
-- Incluye: ats_roles (RBAC) + ats (datos principales)
-- Ejecutar en orden: primero ats_schema.sql, luego audit_schema.sql
-- ============================================

-- Esquema ats_roles (RBAC - Roles and Permissions)
CREATE SCHEMA IF NOT EXISTS ats_roles;

-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

-- Permisos del sistema
CREATE TYPE ats_roles.permission_action AS ENUM (
    'job:create', 'job:read', 'job:update', 'job:delete', 'job:assign_recruiter',
    'candidate:create', 'candidate:read', 'candidate:update', 'candidate:delete', 'candidate:move_stage',
    'activity:create', 'activity:read', 'activity:delete',
    'message:send', 'message:read', 'message:delete',
    'form:create', 'form:read', 'form:update', 'form:delete', 'form:assign',
    'submission:read', 'submission:review', 'submission:approve',
    'analytics:read', 'analytics:export',
    'user:invite', 'user:manage_roles',
    'settings:manage'
);

-- ============================================
-- TABLAS: PERMISOS
-- ============================================

-- Tabla de permisos del sistema
CREATE TABLE ats_roles.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action ats_roles.permission_action NOT NULL UNIQUE,
    description text,
    category text,
    created_at timestamptz DEFAULT now()
);

-- Tabla de roles
CREATE TABLE ats_roles.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Relación rol → permisos (muchos a muchos)
CREATE TABLE ats_roles.role_permissions (
    role_id uuid REFERENCES ats_roles.roles(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES ats_roles.permissions(id) ON DELETE CASCADE,
    granted_at timestamptz DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- Asignación de roles a usuarios
CREATE TABLE ats_roles.user_roles (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id uuid REFERENCES ats_roles.roles(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Permisos específicos por recurso (ej: recruiter asignado a job específico)
CREATE TABLE ats_roles.user_resource_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES ats_roles.permissions(id) ON DELETE CASCADE,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    granted_at timestamptz DEFAULT now(),
    granted_by uuid REFERENCES auth.users(id),
    expires_at timestamptz,
    UNIQUE(user_id, permission_id, resource_type, resource_id)
);

-- ============================================
-- ESQUEMA ATS (Datos del ATS)
-- ============================================

CREATE SCHEMA IF NOT EXISTS ats;

-- Vacantes
CREATE TABLE ats.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    department text,
    location text,
    job_type text CHECK (job_type IN ('full-time', 'part-time', 'contract', 'remote')),
    description text,
    status text DEFAULT 'draft' CHECK (status IN ('open', 'closed', 'draft')),
    responsible_id uuid REFERENCES auth.users(id),
    form_id uuid REFERENCES ats.forms(id),
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Candidatos
CREATE TABLE ats.candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    job_id uuid REFERENCES ats.jobs(id),
    stage text DEFAULT 'applied' CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
    resume_url text,
    notes text,
    rating smallint DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    applied_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Documentos de candidatos
CREATE TABLE ats.candidate_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid REFERENCES ats.candidates(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    doc_type text CHECK (doc_type IN ('cv', 'portfolio', 'certificate', 'id', 'other')),
    uploaded_at timestamptz DEFAULT now()
);

-- Historial de actividades
CREATE TABLE ats.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid REFERENCES ats.candidates(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('stage_change', 'note', 'message', 'rating_change', 'application', 'form_submission')),
    description text NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Mensajes
CREATE TABLE ats.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid REFERENCES ats.candidates(id) ON DELETE CASCADE,
    subject text NOT NULL,
    body text NOT NULL,
    template text,
    sent_at timestamptz DEFAULT now(),
    sent_by uuid REFERENCES auth.users(id)
);

-- Formularios dinámicos
CREATE TABLE ats.forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_template boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Campos de formulario
CREATE TABLE ats.form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid REFERENCES ats.forms(id) ON DELETE CASCADE,
    field_type text NOT NULL,
    label text NOT NULL,
    placeholder text,
    required boolean DEFAULT false,
    options jsonb DEFAULT '[]',
    validation jsonb DEFAULT '{}',
    help_text text,
    field_order integer NOT NULL,
    conditional_rules jsonb DEFAULT '[]'
);

-- Formularios encadenados (chained forms)
CREATE TABLE ats.form_chains (
    from_form_id uuid REFERENCES ats.forms(id) ON DELETE CASCADE,
    to_form_id uuid REFERENCES ats.forms(id) ON DELETE CASCADE,
    PRIMARY KEY (from_form_id, to_form_id)
);

-- Envíos de formularios (tokens para candidatos)
CREATE TABLE ats.sent_forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid REFERENCES ats.forms(id),
    candidate_id uuid REFERENCES ats.candidates(id),
    job_id uuid REFERENCES ats.jobs(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    token text UNIQUE NOT NULL,
    sent_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    expires_at timestamptz
);

-- Respuestas de formularios
CREATE TABLE ats.form_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id uuid REFERENCES ats.forms(id),
    candidate_id uuid REFERENCES ats.candidates(id),
    job_id uuid REFERENCES ats.jobs(id),
    answers jsonb DEFAULT '{}',
    file_data jsonb DEFAULT '{}',
    submitted_at timestamptz DEFAULT now(),
    chained_from_form_id uuid REFERENCES ats.forms(id),
    chained_from_submission_id uuid REFERENCES ats.form_submissions(id)
);

-- Asignación de reclutadores a jobs
CREATE TABLE ats.job_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES ats.jobs(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id),
    UNIQUE(job_id, user_id)
);

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================

-- Jobs
CREATE INDEX idx_jobs_status ON ats.jobs(status);
CREATE INDEX idx_jobs_department ON ats.jobs(department);
CREATE INDEX idx_jobs_created_by ON ats.jobs(created_by);

-- Candidates
CREATE INDEX idx_candidates_job_id ON ats.candidates(job_id);
CREATE INDEX idx_candidates_stage ON ats.candidates(stage);
CREATE INDEX idx_candidates_email ON ats.candidates(email);

-- Activities
CREATE INDEX idx_activities_candidate_id ON ats.activities(candidate_id);
CREATE INDEX idx_activities_type ON ats.activities(type);
CREATE INDEX idx_activities_created_at ON ats.activities(created_at DESC);

-- Messages
CREATE INDEX idx_messages_candidate_id ON ats.messages(candidate_id);
CREATE INDEX idx_messages_sent_at ON ats.messages(sent_at DESC);

-- Forms
CREATE INDEX idx_forms_is_template ON ats.forms(is_template);
CREATE INDEX idx_form_fields_form_id ON ats.form_fields(form_id);

-- Sent Forms
CREATE INDEX idx_sent_forms_token ON ats.sent_forms(token);
CREATE INDEX idx_sent_forms_candidate_id ON ats.sent_forms(candidate_id);
CREATE INDEX idx_sent_forms_status ON ats.sent_forms(status);

-- Form Submissions
CREATE INDEX idx_form_submissions_candidate_id ON ats.form_submissions(candidate_id);
CREATE INDEX idx_form_submissions_form_id ON ats.form_submissions(form_id);

-- Roles
CREATE INDEX idx_user_roles_user_id ON ats_roles.user_roles(user_id);
CREATE INDEX idx_urp_user_id ON ats_roles.user_resource_permissions(user_id);
CREATE INDEX idx_urp_resource ON ats_roles.user_resource_permissions(resource_type, resource_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE ats.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.form_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.sent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats.job_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DATOS INICIALES: PERMISOS
-- ============================================

INSERT INTO ats_roles.permissions (action, description, category) VALUES
-- Jobs
('job:create', 'Crear vacantes', 'jobs'),
('job:read', 'Ver vacantes', 'jobs'),
('job:update', 'Editar vacantes', 'jobs'),
('job:delete', 'Eliminar vacantes', 'jobs'),
('job:assign_recruiter', 'Asignar responsables a vacantes', 'jobs'),
-- Candidates
('candidate:create', 'Crear candidatos', 'candidates'),
('candidate:read', 'Ver candidatos', 'candidates'),
('candidate:update', 'Editar candidatos', 'candidates'),
('candidate:delete', 'Eliminar candidatos', 'candidates'),
('candidate:move_stage', 'Mover entre etapas del pipeline', 'candidates'),
-- Activities
('activity:create', 'Crear actividades', 'activities'),
('activity:read', 'Ver actividades', 'activities'),
('activity:delete', 'Eliminar actividades', 'activities'),
-- Messages
('message:send', 'Enviar mensajes', 'messages'),
('message:read', 'Ver mensajes', 'messages'),
('message:delete', 'Eliminar mensajes', 'messages'),
-- Forms
('form:create', 'Crear formularios', 'forms'),
('form:read', 'Ver formularios', 'forms'),
('form:update', 'Editar formularios', 'forms'),
('form:delete', 'Eliminar formularios', 'forms'),
('form:assign', 'Asignar formularios a vacantes', 'forms'),
-- Submissions
('submission:read', 'Ver envíos de formularios', 'submissions'),
('submission:review', 'Revisar envíos', 'submissions'),
('submission:approve', 'Aprobar/rechazar envíos', 'submissions'),
-- Analytics
('analytics:read', 'Ver analytics', 'analytics'),
('analytics:export', 'Exportar reportes', 'analytics'),
-- Users
('user:invite', 'Invitar usuarios', 'users'),
('user:manage_roles', 'Gestionar roles de usuarios', 'users'),
-- Settings
('settings:manage', 'Gestionar configuración del sistema', 'settings');

-- ============================================
-- DATOS INICIALES: ROLES
-- ============================================

INSERT INTO ats_roles.roles (name, description, is_system) VALUES
('super_admin', 'Administrador total del sistema', true),
('recruiter_manager', 'Gestor de reclutamiento', true),
('recruiter', 'Reclutador', true),
('viewer', 'Solo lectura', true);

-- ============================================
-- ASIGNACIÓN DE PERMISOS A ROLES
-- ============================================

-- super_admin: todos los permisos
INSERT INTO ats_roles.role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM ats_roles.roles WHERE name = 'super_admin'),
    id 
FROM ats_roles.permissions;

-- recruiter_manager: todo excepto user:manage_roles y settings:manage
INSERT INTO ats_roles.role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM ats_roles.roles WHERE name = 'recruiter_manager'),
    id 
FROM ats_roles.permissions
WHERE action NOT IN ('user:manage_roles', 'settings:manage');

-- recruiter: permisos operativos diarios
INSERT INTO ats_roles.role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM ats_roles.roles WHERE name = 'recruiter'),
    id 
FROM ats_roles.permissions
WHERE action IN (
    'job:read', 'job:update',
    'candidate:create', 'candidate:read', 'candidate:update', 'candidate:move_stage',
    'activity:create', 'activity:read',
    'message:send', 'message:read',
    'form:read', 'form:assign',
    'submission:read', 'submission:review',
    'analytics:read'
);

-- viewer: solo lectura
INSERT INTO ats_roles.role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM ats_roles.roles WHERE name = 'viewer'),
    id 
FROM ats_roles.permissions
WHERE action IN (
    'job:read',
    'candidate:read',
    'activity:read',
    'message:read',
    'form:read',
    'submission:read',
    'analytics:read', 'analytics:export'
);