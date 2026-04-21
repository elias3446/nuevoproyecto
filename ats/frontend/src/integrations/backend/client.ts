import axios from 'axios';

// La URL base se construye prefiriendo variables de entorno de Vite
// En producción con Nginx, normalmente basta con '/api'
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API_PORT = import.meta.env.VITE_API_PORT;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente público SIN token, para endpoints abiertos como check-setup o login
export const publicApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para incluir el token JWT de Django en las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores comunes (como 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Sesión expirada o token inválido. Cerrando sesión...');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
