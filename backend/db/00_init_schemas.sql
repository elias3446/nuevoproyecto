-- Crear esquemas necesarios para la segregación de aplicaciones de Django/Celery
CREATE SCHEMA IF NOT EXISTS celery;
CREATE SCHEMA IF NOT EXISTS jwt;
CREATE SCHEMA IF NOT EXISTS django;

-- Otorgar permisos básicos al usuario de la base de datos (generalmente el mismo que crea las tablas)
-- Nota: En Docker el usuario suele ser el definido en .env (DB_USER)
