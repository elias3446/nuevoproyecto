import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useProfile } from './useProfile';

interface PermissionsContextType {
  permissions: string[];
  roles: string[];
  hasPermission: (action: string) => boolean;
  hasAnyPermission: (actions: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
  isAdmin: boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading } = useProfile();

  const permissions = useMemo(() => user?.permissions || [], [user]);
  const roles = useMemo(() => user?.roles || [], [user]);
  
  const isAdmin = useMemo(() => 
    user?.is_staff || roles.includes('Administrador') || roles.includes('Superadministrador'),
    [user, roles]
  );

  const hasPermission = (action: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(action);
  };

  const hasAnyPermission = (actions: string[]): boolean => {
    if (isAdmin) return true;
    return actions.some(action => permissions.includes(action));
  };

  const hasRole = (roleName: string): boolean => {
    return roles.includes(roleName);
  };

  const value = {
    permissions,
    roles,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
    loading
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

/**
 * Componente Guard para proteger elementos de la UI
 */
export const Can: React.FC<{ 
  action?: string; 
  actions?: string[]; 
  role?: string;
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ action, actions, role, children, fallback = null }) => {
  const { hasPermission, hasAnyPermission, hasRole, loading } = usePermissions();

  if (loading) return null;

  let allowed = false;
  if (role) {
    allowed = hasRole(role);
  } else if (actions) {
    allowed = hasAnyPermission(actions);
  } else if (action) {
    allowed = hasPermission(action);
  } else {
    allowed = true; // Si no se especifica nada, se permite
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
};
