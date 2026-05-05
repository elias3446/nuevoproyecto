import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';

export interface DynamicField {
  id?: string;
  name: string;
  label: string;
  field_type: FieldType;
  is_required: boolean;
  options?: string[];
  order: number;
}

export interface EntityDefinition {
  id: string;
  name: string;
  label: string;
  module: string;
  fields: DynamicField[];
  is_active: boolean;
}

export interface DynamicData {
  id: string;
  entity: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useDynamicEntities = (entityId?: string, page: number = 1) => {
  const queryClient = useQueryClient();

  // Obtener definición de esquema por ID de entidad o por ID de módulo
  const schemaQuery = useQuery<EntityDefinition>({
    queryKey: ['dynamic-schema', entityId],
    queryFn: async () => {
      if (!entityId) throw new Error("No entity ID provided");
      const response = await api.get(`/dynamic/schemas/${entityId}/`);
      return response.data;
    },
    enabled: !!entityId
  });

  // Obtener datos de la entidad paginados
  const dataQuery = useQuery<{results: DynamicData[], count: number}>({
    queryKey: ['dynamic-data', entityId, page],
    queryFn: async () => {
      try {
        const response = await api.get(`/dynamic/data/?entity_id=${entityId}&page=${page}`);
        return {
          results: Array.isArray(response.data) ? response.data : response.data.results || [],
          count: response.data.count || (Array.isArray(response.data) ? response.data.length : 0)
        };
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          // DRF lanza 404 si la página no existe (Invalid page)
          return { results: [], count: 0 };
        }
        throw error;
      }
    },
    enabled: !!entityId
  });

  // Mutación para guardar esquema
  const saveSchemaMutation = useMutation({
    mutationFn: async (schema: Partial<EntityDefinition>) => {
      if (schema.id) {
        return api.patch(`/dynamic/schemas/${schema.id}/`, schema);
      }
      return api.post('/dynamic/schemas/', schema);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-schema'] });
      toast.success("Esquema guardado correctamente");
    }
  });

  // Mutación para guardar campos (sincronización masiva)
  const syncFieldsMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string, fields: DynamicField[] }) => {
      return api.post(`/dynamic/schemas/${id}/sync_fields/`, { fields });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-schema'] });
      toast.success("Campos sincronizados");
    }
  });

  // Mutación para guardar datos reales
  const saveDataMutation = useMutation({
    mutationFn: async (payload: { id?: string, entity: string, data: Record<string, any> }) => {
      if (payload.id) {
        return api.patch(`/dynamic/data/${payload.id}/`, payload);
      }
      return api.post('/dynamic/data/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-data', entityId] });
      toast.success("Registro guardado");
    }
  });

  return {
    schema: schemaQuery.data,
    data: dataQuery.data?.results || [],
    totalCount: dataQuery.data?.count || 0,
    isLoading: schemaQuery.isLoading || dataQuery.isLoading,
    saveSchema: saveSchemaMutation.mutateAsync,
    syncFields: syncFieldsMutation.mutateAsync,
    saveData: saveDataMutation.mutateAsync,
    isSaving: saveSchemaMutation.isPending || syncFieldsMutation.isPending || saveDataMutation.isPending
  };
};
