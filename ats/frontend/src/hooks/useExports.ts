import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import { toast } from "sonner";

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

export const useExports = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["exports"],
    queryFn: async () => {
      try {
        const response = await api.get<{ results: ExportRecord[] }>("/audit/exports/list/");
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
      } catch (error) {
        console.error("Error fetching exports:", error);
        return [];
      }
    },
    refetchInterval: (query) => {
      const results = (query as any)?.state?.data;
      if (!Array.isArray(results)) return false;

      const hasActiveTasks = results.some(
        (exp: any) => exp.status === "PENDING" || exp.status === "PROCESSING"
      );
      return hasActiveTasks ? 3000 : false;
    },
  });

  const exports = Array.isArray(data) ? data : [];

  const requestExportMutation = useMutation({
    mutationFn: async (params: { export_type: string; format: string }) => {
      const response = await api.post("/audit/exports/", params);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Exportación iniciada correctamente");
      queryClient.invalidateQueries({ queryKey: ["exports"] });
    },
    onError: (error: any) => {
      toast.error("Error al solicitar exportación: " + (error.response?.data?.error || error.message));
    },
  });

  return {
    exports,
    isLoading,
    requestExport: requestExportMutation.mutate,
    isRequesting: requestExportMutation.isPending,
    refetch,
  };
};
