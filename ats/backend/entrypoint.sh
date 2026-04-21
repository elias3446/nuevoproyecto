#!/bin/sh
# Espera a que PostgreSQL esté accesible usando la variable DB_PORT única.

set -e

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

until python -c "
import os, psycopg2
psycopg2.connect(
    dbname=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
    host=os.environ['DB_HOST'],
    port=os.environ['DB_PORT']
)
" 2>/dev/null; do
    echo "   DB not ready ($DB_HOST:$DB_PORT) — retrying..."
    sleep 2
done

echo "✅ PostgreSQL ready!"

# Ejecuta el comando pasado como argumento
exec "$@"
