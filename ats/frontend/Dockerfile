# â”€â”€â”€ Etapa de Dependencias (CachÃ©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar cÃ³digo y construir
COPY . .
# Argumentos de construcción para Vite
ARG VITE_PUBLIC_PORTAL_URL_DEV
ARG VITE_PUBLIC_PORTAL_URL_PROD
ENV VITE_PUBLIC_PORTAL_URL_DEV=$VITE_PUBLIC_PORTAL_URL_DEV
ENV VITE_PUBLIC_PORTAL_URL_PROD=$VITE_PUBLIC_PORTAL_URL_PROD

RUN npm run build

# â”€â”€â”€ Etapa de Desarrollo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Esta etapa se usarÃ¡ para el servicio 'frontend-dev'
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# El comando se sobreescribe en docker-compose.yml, pero dejamos este por defecto
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# â”€â”€â”€ Etapa Final: ProducciÃ³n (Solo archivos compilados) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Esta etapa se usarÃ¡ para el servicio 'frontend' que alimenta a Nginx
FROM alpine:latest AS production
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Frontend build assets are ready in /app/dist' && sleep infinity"]

