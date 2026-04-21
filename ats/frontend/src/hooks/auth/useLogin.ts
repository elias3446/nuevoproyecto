import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/integrations/backend/client";

export const useLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/login/", { email, password });
      if (response.status === 200) {
        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);
        toast.success("Login exitoso");
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleLogin
  };
};
