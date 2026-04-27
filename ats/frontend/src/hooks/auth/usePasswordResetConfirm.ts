import { useState, useEffect } from "react";
import { toast } from "sonner";
import { publicApi } from "@/integrations/backend/client";
import type { PasswordResetConfirmPayload, PasswordResetValidateResponse } from "@/integrations/backend/types";

export const usePasswordResetConfirm = (token: string) => {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await publicApi.get<PasswordResetValidateResponse>(
          `/password/reset/${token}/`
        );

        if (response.data.valid) {
          setIsValid(true);
          setEmail(response.data.email || "");
        } else {
          setIsValid(false);
          setError(response.data.error || "Token inválido");
        }
      } catch (err: any) {
        setIsValid(false);
        const msg = err.response?.data?.error || "Error al validar el enlace";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleReset = async (newPassword: string, confirmPassword: string) => {
    setValidating(true);

    try {
      const payload: PasswordResetConfirmPayload = {
        token,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      };

      const response = await publicApi.post("/password/reset/confirm/", payload);

      if (response.status === 200) {
        setCompleted(true);
        toast.success("Contraseña actualizada correctamente");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || "Error al cambiar la contraseña";
      toast.error(msg);
      throw err;
    } finally {
      setValidating(false);
    }
  };

  return {
    loading,
    validating,
    isValid,
    email,
    error,
    completed,
    handleReset,
  };
};