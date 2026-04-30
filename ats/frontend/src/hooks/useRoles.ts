import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

export interface Permission {
  id: string;
  action: string;
  description: string;
  category: string;
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

  return {
    roles: rolesQuery.data?.results || [],
    totalCount: rolesQuery.data?.count || 0,
    permissions: permissionsQuery.data || [],
    loading: rolesQuery.isLoading || permissionsQuery.isLoading,
    saveRole: saveRoleMutation.mutateAsync,
    isSaving: saveRoleMutation.isPending
  };
};
