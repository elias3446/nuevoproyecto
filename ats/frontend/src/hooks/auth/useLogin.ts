import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/integrations/backend/client";

export const useLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/login/", { 
        email, 
        password,
        remember_me: rememberMe 
      });
      
      if (response.status === 200) {
        if (!rememberMe) {
          localStorage.setItem("access_token", response.data.access);
          localStorage.setItem("refresh_token", response.data.refresh);
        } else {
          localStorage.setItem("access_token", response.data.access);
        }
        
        toast.success("Login exitoso");
        window.location.href = "/";
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail 
        || error.response?.data?.non_field_errors?.[0] 
        || "Credenciales incorrectas";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    loading,
    handleLogin
  };
};
