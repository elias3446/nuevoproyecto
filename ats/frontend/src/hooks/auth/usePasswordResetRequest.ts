import { useState } from "react";
import { toast } from "sonner";
import { publicApi } from "@/integrations/backend/client";
import type { PasswordResetRequestPayload } from "@/integrations/backend/types";

export const usePasswordResetRequest = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const payload: PasswordResetRequestPayload = { email };
      const response = await publicApi.post("/password/reset/", payload);

      if (response.status === 200) {
        setSuccess(true);
        toast.success("Si el correo existe, recibirás un enlace de recuperación");
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.detail || "Error al procesar la solicitud";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    loading,
    success,
    handleRequest,
  };
};