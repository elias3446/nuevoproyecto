import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

export interface Module {
  id: string;
  name: string;
  label: string;
  icon?: string;
  route?: string;
  order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface Permission {
  id: string;
  action: string;
  description: string;
  category: string;
  module?: string | null; // ID del módulo
  is_system: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Acciones
  is_system: boolean;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

export const useRoles = (config: { 
  rolesPage?: number, 
  modulesPage?: number | 'all', 
  permsPage?: number | 'all',
  rolesSearch?: string,
  modulesSearch?: string,
  permsSearch?: string
} = {}) => {
  const queryClient = useQueryClient();
  const { 
    rolesPage = 1, 
    modulesPage = 1, 
    permsPage = 1,
    rolesSearch = '',
    modulesSearch = '',
    permsSearch = ''
  } = config;

  // Obtener roles paginados
  const rolesQuery = useQuery<PaginatedResponse<Role>>({
    queryKey: ['roles', rolesPage, rolesSearch],
    queryFn: async () => {
      const response = await api.get(`/roles/management/?page=${rolesPage}&search=${rolesSearch}`);
      if (Array.isArray(response.data)) {
          return { results: response.data, count: response.data.length };
      }
      return response.data;
    }
  });

  // Obtener catálogo de permisos paginado o completo
  const permissionsQuery = useQuery<PaginatedResponse<Permission>>({
    queryKey: ['permissions-catalog', permsPage, permsSearch],
    queryFn: async () => {
      let url = permsPage === 'all' 
        ? '/roles/permissions/?all=true' 
        : `/roles/permissions/?page=${permsPage}`;
      
      if (permsSearch) url += `&search=${permsSearch}`;
      url += url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
      
      const response = await api.get(url);
      if (Array.isArray(response.data)) {
          return { results: response.data, count: response.data.length };
      }
      return response.data;
    }
  });

  // Obtener catálogo de módulos paginado o completo
  const modulesQuery = useQuery<PaginatedResponse<Module>>({
    queryKey: ['modules-catalog', modulesPage, modulesSearch],
    queryFn: async () => {
      let url = modulesPage === 'all' 
        ? '/roles/modules/?all=true' 
        : `/roles/modules/?page=${modulesPage}`;
      
      if (modulesSearch) url += `&search=${modulesSearch}`;
      url += url.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;

      const response = await api.get(url);
      if (Array.isArray(response.data)) {
          return { results: response.data, count: response.data.length };
      }
      return response.data;
    }
  });

  // Mutación para crear/actualizar roles
  const saveRoleMutation = useMutation({
    mutationFn: async (role: Partial<Role>) => {
      if (role.id) {
        return api.patch(`/roles/management/${role.id}/`, role);
      }
      return api.post('/roles/management/', role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success("Rol guardado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Error al guardar el rol");
    }
  });

  // Mutación para módulos
  const saveModuleMutation = useMutation({
    mutationFn: async (module: Partial<Module>) => {
      if (module.id) {
        return api.patch(`/roles/modules/${module.id}/`, module);
      }
      return api.post('/roles/modules/', module);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules-catalog'] });
      toast.success("Módulo guardado");
    },
    onError: (error: any) => {
      const details = error.response?.data ? Object.values(error.response.data).flat().join(', ') : "Error al guardar el módulo";
      toast.error(details);
    }
  });

  // Mutación para permisos
  const savePermissionMutation = useMutation({
    mutationFn: async (permission: Partial<Permission>) => {
      if (permission.id) {
        return api.patch(`/roles/permissions/${permission.id}/`, permission);
      }
      return api.post('/roles/permissions/', permission);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-catalog'] });
      toast.success("Permiso guardado");
    },
    onError: (error: any) => {
      const details = error.response?.data ? Object.values(error.response.data).flat().join(', ') : "Error al guardar el permiso";
      toast.error(details);
    }
  });

  return {
    roles: rolesQuery.data?.results || [],
    rolesCount: rolesQuery.data?.count || 0,
    permissions: permissionsQuery.data?.results || [],
    permissionsCount: permissionsQuery.data?.count || 0,
    modules: modulesQuery.data?.results || [],
    modulesCount: modulesQuery.data?.count || 0,
    loading: rolesQuery.isLoading || permissionsQuery.isLoading || modulesQuery.isLoading,
    saveRole: saveRoleMutation.mutateAsync,
    isSaving: saveRoleMutation.isPending,
    saveModule: saveModuleMutation.mutateAsync,
    savePermission: savePermissionMutation.mutateAsync,
  };
};
