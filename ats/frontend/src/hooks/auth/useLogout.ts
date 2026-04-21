import { api } from "@/integrations/backend/client";

export const useLogout = () => {
  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await api.post("/logout/", { refresh: refreshToken });
      }
    } catch (error) {
      console.error("Error al invalidar el token en el servidor", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
  };

  return { handleLogout };
};
