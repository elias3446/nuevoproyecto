export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Representa el modelo de Usuario del Backend (Django - ats).
 */
export interface User {
  id: string;           // UUID
  email: string;
  is_active: boolean;
  is_staff: boolean;
  raw_app_meta_data: Record<string, any>;
  raw_user_meta_data: Record<string, any>;
  created_at: string;   // ISO DateTime
  updated_at: string;   // ISO DateTime
  last_sign_in_at: string | null;
}

/**
 * Respuesta estándar para procesos de autenticación (JWT).
 * Mapeada a los endpoints: POST /api/login/, POST /api/token/refresh/
 */
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

/**
 * Payload para registrar un usuario nuevo.
 * Mapeado al endpoint: POST /api/register/
 */
export interface RegisterPayload {
  email: string;
  password: string;
  password2: string;
}

/**
 * Payload para iniciar sesión.
 * Mapeado al endpoint: POST /api/login/
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Respuesta del endpoint GET /api/check-setup/
 * Indica si ya existe un superusuario en el sistema.
 */
export interface CheckSetupResponse {
  setup_complete: boolean;
}

/**
 * Estructura genérica para errores de la API (Django REST Framework).
 */
export interface ApiError {
  detail?: string;
  [key: string]: any;
}

// Añade aquí más interfaces a medida que el backend de ats exponga nuevos modelos.
// Ejemplo: export interface Post { id: number; title: string; author: User; }
