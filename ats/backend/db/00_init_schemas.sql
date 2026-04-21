-- Crear esquemas necesarios para la segregación de aplicaciones de Django/Celery
CREATE SCHEMA IF NOT EXISTS celery;
CREATE SCHEMA IF NOT EXISTS jwt;
CREATE SCHEMA IF NOT EXISTS django;
CREATE SCHEMA IF NOT EXISTS auth;

-- Otorgar permisos básicos al usuario de la base de datos
