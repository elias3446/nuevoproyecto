import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

/**
 * Modelo de registro de exportación devuelto por el backend.
 */
export interface ExportRecord {
  id: string;
  export_type: string;
  format: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  status_display: string;
  record_count: number;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Parámetros para solicitar una nueva exportación.
 */
export interface RequestExportParams {
  export_type: string;
  format: string;
}

/**
 * Hook para gestionar la mutación de solicitud de exportación.
 *
 * La obtención de datos (listado paginado) se delega a `useServerTable`
 * usando la URL `/audit/exports/list/`.
 *
 * @example
 * const { requestExport, isRequesting } = useExports();
 */
export const useExports = () => {
  const queryClient = useQueryClient();

  const requestExportMutation = useMutation({
    mutationFn: async (params: RequestExportParams) => {
      const response = await api.post("/audit/exports/", params);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Exportación iniciada correctamente");
      // Invalidar todas las páginas del listado
      queryClient.invalidateQueries({
        queryKey: ["server-table", "/audit/exports/list/"],
      });
    },
    onError: (error: any) => {
      toast.error(
        "Error al solicitar exportación: " +
          (error.response?.data?.error || error.message)
      );
    },
  });

  return {
    requestExport: requestExportMutation.mutate,
    isRequesting: requestExportMutation.isPending,
  };
};
