import { lazy, LazyExoticComponent, ReactNode } from 'react';

// Tipado para los componentes del registro
export type RegisteredModule = LazyExoticComponent<any> | React.FC<any>;

// Registro centralizado de módulos
// Esto permite que el backend nos diga "ID: profile" y nosotros sepamos qué renderizar
export const MODULE_REGISTRY: Record<string, RegisteredModule> = {
  'dashboard': lazy(() => import('@/components/dashboard/DashboardModule')),
  
  'profile': lazy(() => import('@/components/user/ProfileModule')),
  
  'security': lazy(() => import('@/pages/Security')),
  'settings': lazy(() => import('@/pages/Security')),
};

/**
 * Función para obtener un módulo del registro con un fallback
 */
export const getModule = (moduleId: string): RegisteredModule => {
  return MODULE_REGISTRY[moduleId] || MODULE_REGISTRY['dashboard'];
};
