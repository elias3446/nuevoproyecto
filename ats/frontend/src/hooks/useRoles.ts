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
}

export interface Permission {
  id: string;
  action: string;
  description: string;
  category: string;
  module?: string; // ID del módulo
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Acciones
  is_system: boolean;
}

export const useRoles = (page: number = 1) => {
  const queryClient = useQueryClient();

  // Obtener roles paginados
  const rolesQuery = useQuery<{ results: Role[], count: number }>({
    queryKey: ['roles', page],
    queryFn: async () => {
      const response = await api.get(`/roles/management/?page=${page}`);
      // Si el backend no devuelve resultados (ej: paginación desactivada), 
      // manejamos el formato array anterior para compatibilidad.
      if (Array.isArray(response.data)) {
          return { results: response.data, count: response.data.length };
      }
      return response.data;
    }
  });

  // Obtener catálogo de permisos
  const permissionsQuery = useQuery<Permission[]>({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const response = await api.get('/roles/permissions/');
      return Array.isArray(response.data) ? response.data : response.data.results;
    }
  });

  // Obtener catálogo de módulos
  const modulesQuery = useQuery<Module[]>({
    queryKey: ['modules-catalog'],
    queryFn: async () => {
      const response = await api.get('/roles/modules/');
      return Array.isArray(response.data) ? response.data : response.data.results;
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
    }
  });

  return {
    roles: rolesQuery.data?.results || [],
    totalCount: rolesQuery.data?.count || 0,
    permissions: permissionsQuery.data || [],
    modules: modulesQuery.data || [],
    loading: rolesQuery.isLoading || permissionsQuery.isLoading || modulesQuery.isLoading,
    saveRole: saveRoleMutation.mutateAsync,
    isSaving: saveRoleMutation.isPending,
    saveModule: saveModuleMutation.mutateAsync,
    savePermission: savePermissionMutation.mutateAsync,
  };
};
