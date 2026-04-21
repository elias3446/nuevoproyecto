# 🌐 Portal Público de Candidatos (React + Vite)

Este proyecto es el portal de cara al público para los candidatos. Su arquitectura es **Frontend-Only**, lo que significa que no tiene un backend propio, sino que consume los servicios y la base de datos centralizada del proyecto **ATS**. Está orquestado mediante **Docker Compose** con entornos de desarrollo rápido y producción segura con Nginx.

---

## 📋 Requisitos Previos

Asegúrate de tener instalados los siguientes programas:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine).
- **Docker Compose** (instalado por defecto con Docker Desktop).
- **Backend ATS encendido**: Este portal requiere que el backend del proyecto `ats` esté corriendo para poder mostrar información.

---

## 🛠️ Instalación y Puesta en Marcha

1. **Configuración de Variables de Entorno**
   Valida que tengas el archivo `.env` en la raíz de `portaPublico`.
   > **⚠️ Importante**: Asegúrate de que `ATS_SERVER_IP` y `ATS_APP_PORT` coincidan con la ubicación real de tu servidor ATS.

2. **Levantar los Contenedores**
   Abre una terminal en la raíz del proyecto y elige el comando según tu necesidad:

   **Opción A: Levantar TODO (Desarrollo y Producción a la vez)**
   ```bash
   docker-compose up -d --build
   ```

   **Opción B: Levantar SOLO en Modo Desarrollo (HMR Activo)**
   Ideal para programar la interfaz. Usa el servidor de desarrollo de Vite en el puerto **8080**.
   ```bash
   docker-compose up -d --build frontend-dev
   ```

   **Opción C: Levantar SOLO en Modo Producción (Nginx + HTTPS)**
   Compila el frontend al máximo nivel de optimización y lo sirve mediante Nginx (HTTPS).
   ```bash
   docker-compose up -d --build frontend nginx
   ```

---

## 🗺️ Mapa de Puertos y Accesos

### 💻 1. Modo Desarrollo (Programación)
- **Frontend** (React/Vite): [http://localhost:8080](http://localhost:8080)
- **Consumo de API**: Apunta al `ATS_SERVER_IP` definido en el `.env`.

### 🚀 2. Modo Producción (Simulación Real)
- **Frontend** (Nginx/HTTPS): [https://localhost](https://localhost)

> **⚠️ Advertencia SSL**: Al abrir la versión de Producción, pulsa en **"Configuración Avanzada" -> "Continuar a localhost"**, ya que los certificados son auto-firmados para pruebas locales.

---

## 🔧 Comandos Útiles

* **Apagar el portal**:
  ```bash
  docker-compose down
  ```
* **Ver registros de errores**:
  ```bash
  docker logs portapublico_frontend_dev --tail 50 -f
  ```
* **Reinstalar dependencias (npm install)**:
  Si añades una nueva librería, reconstruye el contenedor:
  ```bash
  docker-compose up -d --build
  ```

---

## 🔗 Integración con ATS

Para que este portal funcione correctamente, el backend de **ATS** debe tener permiso para recibir peticiones de esta aplicación. Asegúrate de que en el `.env` de **ATS**, la variable `CORS_ALLOWED_ORIGINS` incluya la IP y los puertos de este portal:
* `http://localhost:8080` (Dev)
* `http://[TU_IP]:80` (Prod)

---

## 🎨 Estructura del Proyecto

* `/frontend`: Aplicación React + Vite + TailwindCSS + ShadcnUI.
* `/frontend/src/integrations/backend`: Lógica de conexión con el motor de ATS.
* `/nginx`: Configuración de servidor web y certificados SSL.
* `docker-compose.yml`: Orquestador de servicios de infraestructura.
