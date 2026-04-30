import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  required_permission: string | null;
}

export interface UIConfig {
  menu: MenuItem[];
  theme_config: {
    primary_color: string;
    company_name: string;
  };
}

export const useUIConfig = () => {
  return useQuery<UIConfig>({
    queryKey: ['ui-config'],
    queryFn: async () => {
      const response = await api.get('/roles/ui-config/');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
};
