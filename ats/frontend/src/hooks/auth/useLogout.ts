import { api, clearTokens } from "@/integrations/backend/client";

export const useLogout = () => {
  const handleLogout = async () => {
    try {
      await api.post("/logout/", {}, { withCredentials: true });
    } catch (error) {
      console.error("Error al invalidar el token en el servidor", error);
    } finally {
      clearTokens();
      window.location.href = "/login";
    }
  };

  return { handleLogout };
};
