import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/backend/client';
import { sessionNotifier } from '@/integrations/backend/socket';
import { User } from '@/integrations/backend/types';
import { UIConfig } from '../useUIConfig';

interface GlobalConfigContextType {
  user: User | null;
  permissions: string[];
  uiConfig: UIConfig | null;
  loading: boolean;
  isReady: boolean;
  refresh: () => void;
}

const GlobalConfigContext = createContext<GlobalConfigContextType | undefined>(undefined);

export const GlobalConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const isAuthenticated = !!localStorage.getItem('access_token');

  // 1. Fetch Profile & Permissions (via updated UserSerializer)
  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery<User | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await api.get('/me/');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch UI Config
  const { data: uiConfig, isLoading: uiLoading, refetch: refetchUI } = useQuery<UIConfig | null>({
    queryKey: ['ui-config'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await api.get('/roles/ui-config/');
      return response.data;
    },
    enabled: isAuthenticated && !!user, // Esperar a tener el usuario para asegurar contexto
    staleTime: 10 * 60 * 1000,
  });

  // 3. Integración con WebSockets para invalidación reactiva
  useEffect(() => {
    if (isAuthenticated) {
      sessionNotifier.connect();
      
      // Listener para actualizaciones de permisos o roles
      const handleSecurityUpdate = () => {
        console.log("Security update received via Socket, refreshing config...");
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['ui-config'] });
      };

      // Asumimos que el backend envía este evento
      // sessionNotifier.on('security_update', handleSecurityUpdate);
    }
    
    return () => {
      sessionNotifier.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  const refresh = () => {
    refetchUser();
    refetchUI();
  };

  const value = {
    user: user || null,
    permissions: user?.permissions || [],
    uiConfig: uiConfig || null,
    loading: userLoading || uiLoading,
    isReady: !!user && !!uiConfig,
    refresh
  };

  return (
    <GlobalConfigContext.Provider value={value}>
      {children}
    </GlobalConfigContext.Provider>
  );
};

export const useGlobalConfig = () => {
  const context = useContext(GlobalConfigContext);
  if (context === undefined) {
    throw new Error('useGlobalConfig must be used within a GlobalConfigProvider');
  }
  return context;
};
