import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/integrations/backend/client";

export const useRegister = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/register/", { email, password });
      if (response.status === 201) {
        toast.success("Cuenta creada exitosamente");
        window.location.href = "/login";
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.email 
        ? error.response.data.email[0] 
        : error.response?.data?.detail 
          ? error.response.data.detail 
          : "Error al crear la cuenta";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    handleRegister
  };
};