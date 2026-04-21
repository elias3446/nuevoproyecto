import axios from 'axios';

// La URL base se construye prefiriendo variables de entorno de Vite.
// En producción con Nginx, normalmente basta con '/api'
// Selección automática de URL según el entorno (Desarrollo vs Producción)
const API_BASE = import.meta.env.DEV 
  ? import.meta.env.VITE_PORTAL_API_BASE_URL_DEV 
  : import.meta.env.VITE_PORTAL_API_BASE_URL;

if (!API_BASE) {
  console.warn('ADVERTENCIA: No se ha definido la URL del Backend para el entorno actual.');
}

// Cliente público SIN token — para endpoints abiertos como check-setup o login
export const publicApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente privado CON token — para endpoints protegidos (requiere JWT)
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST: adjunta el token JWT de Django en cada petición privada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores comunes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. Manejo de Sesión Expirada (401)
    if (error.response?.status === 401) {
      console.warn('Sesión expirada o token inválido. Cerrando sesión...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 2. Manejo de Error de Conexión o URL no configurada
    // Si no hay respuesta (error de red) o el servidor no existe
    if (!error.response || !API_BASE) {
      console.error('Error crítico de conexión con el backend de ATS.');
      window.location.href = '/404'; // Redirigimos a la página de error
    }

    return Promise.reject(error);
  }
);
