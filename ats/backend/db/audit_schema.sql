-- ============================================
-- ESQUEMA DE AUDITORÍA
-- ============================================
-- Este archivo contiene el esquema completo para auditoría del sistema ATS
-- Ejecutar después de ats_schema.sql
-- ============================================

CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================
-- TABLAS DE AUDITORÍA
-- ============================================

-- Logs principales de auditoría (trackea todos los cambios)
CREATE TABLE audit.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    session_id uuid REFERENCES auth.sessions(id),
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT')),
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Logs de acceso denegado (trackea intentos fallidos)
CREATE TABLE audit.access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    ip_address inet,
    user_agent text,
    reason text,
    created_at timestamptz DEFAULT NOW()
);

-- Logs de exportación (trackea exports de datos)
CREATE TABLE audit.exports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    export_type text NOT NULL,
    filters jsonb DEFAULT '{}',
    format text NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf', 'json')),
    record_count integer,
    file_url text,
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX idx_audit_logs_user_id ON audit.logs(user_id);
CREATE INDEX idx_audit_logs_table_record ON audit.logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit.logs(created_at DESC);

CREATE INDEX idx_audit_access_logs_user_id ON audit.access_logs(user_id);
CREATE INDEX idx_audit_access_logs_created_at ON audit.access_logs(created_at DESC);

CREATE INDEX idx_audit_exports_user_id ON audit.exports(user_id);
CREATE INDEX idx_audit_exports_created_at ON audit.exports(created_at DESC);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE audit.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.exports ENABLE ROW LEVEL SECURITY;