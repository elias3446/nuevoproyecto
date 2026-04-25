# 🚀 Proyecto Full-Stack Dockerizado (React + Django)

Este proyecto emplea una arquitectura moderna, separando el frontend y el backend en servicios independientes orquestados mediante **Docker Compose**. Contamos con entornos listos para **Desarrollo Rápido** (HMR y auto-recarga) y **Producción** (Nginx + HTTPS).

---

## 📋 Requisitos Previos

Asegúrate de tener instalados los siguientes programas en tu entorno:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine en Linux/Mac).
- **Docker Compose** (instalado por defecto junto a Docker Desktop).

---

## 🛠️ Instalación y Puesta en Marcha

1. **Configuración de Variables de Entorno**
   Asegúrate de tener en la raíz de tu proyecto un archivo oculto llamado `.env`. Este archivo contiene contraseñas de bases de datos, claves secretas y puertos. (Si acabas de descargar el proyecto, renombra el archivo `.env.example` a `.env` en caso de existir, o valida tu `.env` actual).

2. **Levantar los Contenedores**
   Abre una terminal (PowerShell o CMD en Windows) en la raíz del proyecto y elige el comando que mejor se adapte a tu necesidad actual:

   **Opción A: Levantar TODO (Desarrollo y Producción a la vez)**
   ```bash
   docker-compose up -d --build
   ```
   *Nota: La primera vez descargará todas las dependencias e imágenes base, lo cual puede tardar unos minutos.*

   **Opción B: Levantar SOLO en Modo Desarrollo (Recomendado para programar)**
   Levanta la base de datos, Redis, el Backend, Celery y el servidor de desarrollo de Vite (Frontend en el puerto 3000). Omite compilar Nginx y la versión estática de producción.
   ```bash
   docker-compose up -d --build db redis backend frontend-dev celery-worker celery-beat smtp
   ```

   **Opción C: Levantar SOLO en Modo Producción (Recomendado para probar despliegue)**
   Levanta la base de datos, Redis, el Backend, Celery, compila el Frontend y levanta Nginx (HTTPS). Omite el servidor de desarrollo de Vite.
   ```bash
   docker-compose up -d --build db redis backend frontend nginx celery-worker celery-beat smtp
   ```

---

## 🗺️ Mapa de Puertos y Accesos

Tu ecosistema ahora funciona en dos entornos paralelos. ¡Elige el que necesites!

### 💻 1. Modo Desarrollo (Programación Activa)
Ideal para escribir código. Cuenta con **Hot Reload**; cada vez que guardes un archivo el cambio se reflejará instantáneamente, y el protocolo usado es **HTTP**.
- **Frontend** (React/Vite): [http://localhost:3000](http://localhost:3000)
- **Backend API** (Django/runserver): [http://localhost:8000/api/](http://localhost:8000/api/)
- **Backend Admin** (Django): [http://localhost:8000/admin/](http://localhost:8000/admin/)

### 🚀 2. Modo Producción (Entorno Real)
Ideal para pruebas finales. Simula un despliegue en un servidor real expuesto a internet. El frontend es compilado (`npm run build`) y servido velozmente mediante **Nginx** con un protocolo seguro **HTTPS**.
- **Frontend** (Nginx): [https://localhost](https://localhost)
- **Backend API** (Gunicorn): [https://localhost/api/](https://localhost/api/)
- **Backend Admin** (Gunicorn): [https://localhost/admin/](https://localhost/admin/)

> **⚠️ Advertencia de Privacidad (HTTPS)**: Al intentar abrir la versión Producción, tu navegador te advertirá *"La conexión no es privada"*. Esto ocurre porque los certificados SSL los generó Docker y no una agencia comercial. Pulsa en **"Configuración Avanzada" -> "Continuar a localhost"** para acceder de manera segura.

### ⚙️ 3. Servicios Internos y Bases de Datos
Son de consumo automático por los contenedores, pero han sido expuestos a puertos específicos por si deseas conectarte a ellos usando un gestor externo (DBeaver, pgAdmin, Redis Insight, etc.):
- **Base de Datos (PostgreSQL 17)**: `localhost:5433`
- **Caché/Broker (Redis 7)**: `localhost:6380`

### 📧 4. Correo y Webmail
El sistema incluye un servidor de correo local (Postfix/Dovecot) y una interfaz Webmail, pero está configurado por defecto para enviar notificaciones al exterior usando **Google (Gmail)** para garantizar la entrega y evitar bloqueos por spam.

- **Webmail Local (Roundcube)**: [https://localhost/webmail/](https://localhost/webmail/) (Para visualizar correos internos).
- **SMTP Interno (Envío)**: `localhost:25`
- **IMAP Interno (Recuperación)**: `localhost:143`

#### 🔗 Configuración de Envío al Exterior (Recomendado: Gmail)
Para que la plataforma (ej. al registrar un usuario) envíe correos reales a cualquier dominio, debes configurar tus credenciales en el archivo `.env`:
1. Activa la "Verificación en dos pasos" en tu cuenta de Google.
2. Genera una **Contraseña de Aplicación** (16 letras) desde este enlace: [Generar App Password de Google](https://myaccount.google.com/apppasswords).
3. Modifica tu archivo `.env` en la raíz de `ats/` con esos datos:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USE_TLS=True
   SMTP_USER=tu_correo_real@gmail.com
   SMTP_PASSWORD="tu_contraseña_de_aplicacion"
   DEFAULT_FROM_EMAIL=tu_correo_real@gmail.com
   ```
4. Aplica los cambios reconstruyendo los contenedores encargados de enviar el correo: `docker-compose up -d backend celery-worker`.

#### ⚠️ ¿Quieres usar tu propio servidor SMTP local para enviar a Internet?
El servidor SMTP local incluido en este proyecto es ideal para **pruebas locales** o mensajería interna. Si deseas enviar correos al exterior *sin depender de Gmail u otro servicio externo (SendGrid, AWS)*, requerirás infraestructura profesional:
- **Servidor VPS (Cloud)** con una IP Pública Estática y puerto 25 de salida desbloqueado.
- Un **Dominio Real** (.com, .net, etc.).
- Configurar registros DNS de seguridad obligatorios: **PTR (Reverse DNS)**, **SPF**, **DKIM** y **DMARC**. 
Sin esto, Gmail, Outlook y otros proveedores rechazarán tus correos locales instantáneamente considerándolos Spam.

---

## 🔧 Comandos Útiles de Mantenimiento

* **Apagar todos los servicios**:
  ```bash
  docker-compose down
  ```
* **Ver registros o buscar errores en un servicio (ej: frontend de desarrollo)**:
  ```bash
  docker logs myapp_frontend_dev --tail 50 -f
  ```
* **Actualizar un servicio específico** (Útil cuando instalas un nuevo paquete por npm):
  ```bash
  docker-compose stop frontend-dev
  docker rm -v myapp_frontend_dev
  docker-compose up -d frontend-dev
  ```
* **Hacer una limpieza total y levantar** (si algo se rompe):
  ```bash
  docker-compose down
  docker-compose up -d --build --force-recreate
  ```

---

## 🏗️ Pasar Cambios de Desarrollo a Producción

Dado que trabajas con los contenedores interactivos de desarrollo (HMR local), los cambios que hagas en tus archivos modificarán instantáneamente el servidor de Desarrollo. Sin embargo, para aplicarlos eficientemente al entorno de Producción (HTTPS / Nginx), el proceso varía según el área que hayas editado:

### 1. Cambios en el Frontend (React / Vite)
El código de producción de React **no es dinámico**, sino archivos hiper-optimizados (`.js` y `.css` estáticos). Si cambias un componente o color, debes **agendar una compilación** en el contenedor de front:
```bash
docker-compose up -d --build frontend
```
*(Esto ejecutará un `npm run build` automatizado, regenerará los minificados y Nginx actualizará la página instantáneamente pasados los segundos).*

### 2. Cambios en el Backend (Django)
Tu base de código Python ya está sincronizada al contenedor gracias a los volúmenes en tiempo real. Sin embargo, el servidor de producción Gunicorn **no se auto-recarga automáticamente** al detectar cambios en el código para mantener la máxima estabilidad. Aplícalos simplemente reiniciando el servicio:
```bash
docker-compose restart backend
```

### 3. Has creado nuevas ramas o dependencias (Nuevas Librerías)
Si corriste comandos de `npm install [paquete]` o actualizaste el `requirements.txt` de Python, debes reconstruir tu arquitectura general:
```bash
docker-compose up -d --build
```

---

## 🎨 Estructura del Proyecto

* `/frontend`: Aplicación React + Vite + TailwindCSS.
* `/backend`: Aplicación Python + Django REST Framework.
* `/nginx`: Configuraciones de router, despliegue, SSL y proxy inverso.
* `docker-compose.yml`: El archivo orquestador maestro.
