# 🚀 Ecosistema ATS + Portal Público (Orquestador Maestro)

Este repositorio contiene la arquitectura completa de reclutamiento. Gestionamos dos proyectos independientes mediante un **Orquestador Maestro** en la raíz, permitiendo levantar todo el sistema con un solo comando.

---

## 📋 Arquitectura del Ecosistema

1.  **ATS (Gestor Interno)**: Sistema centralizado para RRHH (Django + React + PostgreSQL).
2.  **PortaPublico (Portal Candidatos)**: Interfaz ligera para aspirantes (React + Nginx) que consume los servicios del ATS.

---

## 🛠️ Instalación y Puesta en Marcha

Desde esta carpeta raíz (`Nueva carpeta (3)`), puedes controlar ambos proyectos simultáneamente:

### Opción A: Levantar TODO (Modo Mixto)
Levanta todos los servicios, bases de datos y servidores de desarrollo de ambos proyectos.
```bash
docker-compose up -d --build
```

### Opción B: Levantar SOLO PRODUCCIÓN 🚀
Levanta los servicios optimizados, compilados y servidos por Nginx con HTTPS para ambos mundos.
```bash
docker-compose up -d --build db redis backend nginx frontend portal-nginx portal-frontend smtp
```

### Opción C: Levantar SOLO DESARROLLO 💻
Levanta las bases de datos y los servidores con Hot-Reload (Vite en puerto 3000 y 8080).
```bash
docker-compose up -d --build db redis backend frontend-dev portal-frontend-dev smtp
```

---

## 🗺️ Mapa de Puertos Integrado

| Servicio | Acceso Local (URL) | Proyecto | Entorno |
| :--- | :--- | :--- | :--- |
| **ATS Admin/API** | [https://localhost](https://localhost) | ATS | Producción |
| **ATS RRHH** | [http://localhost:3000](http://localhost:3000) | ATS | Desarrollo |
| **Webmail (Roundcube)** | [https://localhost/webmail/](https://localhost/webmail/) | ATS | Producción |
| **Portal Candidatos** | [https://localhost:444](https://localhost:444) | portaPublico | Producción |
| **Portal Candidatos** | [http://localhost:8080](http://localhost:8080) | portaPublico | Desarrollo |

> **Nota sobre el Servidor de Correo (SMTP / Webmail)**: El ecosistema levanta automáticamente un servidor de mensajería interna (Postfix/Roundcube). Sin embargo, para enviar **notificaciones al exterior** (como correos de registro a candidatos), se recomienda usar una cuenta real de Gmail configurada en `ats/.env`. [Revisa las instrucciones detalladas en ats/README.md](ats/README.md#4-correo-y-webmail) para saber cómo generar tu contraseña de aplicación o los requisitos para tener un SMTP propio público.


---

## 🔧 Comandos Útiles de Raíz

*   **Apagar todo el ecosistema**:
    ```bash
    docker-compose down
    ```
*   **Limpiar y reconstruir todo** (Si algo falla):
    ```bash
    docker-compose down && docker-compose up -d --build --force-recreate
    ```
*   **Ver el estado de todos los contenedores**:
    ```bash
    docker-compose ps
    ```

---

## 📂 Organización del Repositorio

*   **`/ats`**: El motor principal (Backend Django, Base de Datos, Frontend Interno).
*   **`/portaPublico`**: El portal ligero de visualización para candidatos.
*   **`docker-compose.yml`**: Orquestador maestro que une los dos mundos mediante la directiva `include`.
