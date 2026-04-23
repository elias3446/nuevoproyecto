-- Crear esquemas necesarios para la segregación de aplicaciones de Django/Celery
CREATE SCHEMA IF NOT EXISTS celery;
CREATE SCHEMA IF NOT EXISTS jwt;
CREATE SCHEMA IF NOT EXISTS django;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS ats;
CREATE SCHEMA IF NOT EXISTS ats_roles;
CREATE SCHEMA IF NOT EXISTS audit;
