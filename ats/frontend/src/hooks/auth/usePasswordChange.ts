import { useState } from "react";
import { toast } from "sonner";
import { api, clearTokens } from "@/integrations/backend/client";
import type { PasswordChangePayload } from "@/integrations/backend/types";

export const usePasswordChange = () => {
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (payload: PasswordChangePayload) => {
    setLoading(true);
    try {
      const response = await api.post("/password/change/", payload);

      if (response.status === 200) {
        toast.success("Contraseña actualizada correctamente. Por favor, inicia sesión de nuevo.");
        clearTokens();
        window.location.href = "/login";
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.detail || "Error al cambiar la contraseña";
      if (Array.isArray(msg)) {
        toast.error(msg.join(", "));
      } else {
        toast.error(msg);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleChangePassword,
  };
};