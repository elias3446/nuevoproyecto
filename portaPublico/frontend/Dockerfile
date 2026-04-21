# ─── Etapa de Dependencias (Caché) ──────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código y construir
COPY . .
RUN npm run build

# ─── Etapa de Desarrollo ───────────────────────────────────────────────────
# Esta etapa se usará para el servicio 'frontend-dev'
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# El comando se sobreescribe en docker-compose.yml
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── Etapa Final: Producción (Solo archivos compilados) ─────────────────────
# Esta etapa se usará para el servicio 'frontend' que alimenta a Nginx
FROM alpine:latest AS production
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Frontend build assets are ready in /app/dist' && sleep infinity"]
