FROM nginx:1.25-alpine

# Borrar configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Generar certificado SSL auto-firmado para pruebas
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=EC/ST=General/L=City/O=LocalApp/OU=Dev/CN=localhost"

# Copiar plantilla para envsubst (la imagen oficial la procesa automáticamente)
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template

# Directorios para persistencia de archivos estáticos y media
RUN mkdir -p /app/staticfiles
RUN mkdir -p /app/media
