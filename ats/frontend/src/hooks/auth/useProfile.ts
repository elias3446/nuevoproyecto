import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/integrations/backend/client";
import type { User } from "@/integrations/backend/types";

export const useProfile = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading: loading, refetch } = useQuery<User | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const response = await api.get('/me/');
        const userData = response.data;
        
        // Compute avatar_url from raw_user_meta_data
        if (userData.raw_user_meta_data?.avatar_url) {
          userData.avatar_url = userData.raw_user_meta_data.avatar_url;
        }
        
        return userData;
      } catch (error) {
        console.error("Error fetching profile", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  return {
    user: user || null,
    loading,
    refetch,
    invalidateProfile,
  };
};
