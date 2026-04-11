export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Representa el modelo de Usuario del Backend (Django).
 */
export interface User {
  id: string; // UUID
  email: string;
  is_active: boolean;
  is_staff: boolean;
  raw_app_meta_data: Record<string, any>;
  raw_user_meta_data: Record<string, any>;
  created_at: string; // ISO DateTime
  updated_at: string; // ISO DateTime
  last_sign_in_at: string | null;
}

/**
 * Respuesta estándar para procesos de autenticación (JWT).
 */
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

/**
 * Estructura para errores de la API.
 */
export interface ApiError {
  detail?: string;
  [key: string]: any;
}

// Aquí puedes añadir más interfaces para tus modelos de Django
// ejemplo: export interface Post { id: number; title: string; content: string; author: User; }
