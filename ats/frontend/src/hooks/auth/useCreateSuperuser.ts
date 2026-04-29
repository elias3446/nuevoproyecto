import { useState } from "react";
import { toast } from "sonner";
import { publicApi } from "@/integrations/backend/client";

export const useCreateSuperuser = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await publicApi.post("/register-superuser/", { 
        email, 
        password 
      });

      if (response.status === 201 || response.status === 200) {
        toast.success("Superusuario creado exitosamente");
        // Redirect to login
        setTimeout(() => {
           window.location.href = "/login";
        }, 1500);
      }
    } catch (error: any) {
      console.error(error);
      const data = error.response?.data;
      if (data) {
        toast.error(data.detail || data.email?.[0] || data.password?.[0] || "Error al crear superusuario");
      } else {
        toast.error("Error de conexión al servidor");
      }
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
    handleSubmit
  };
};
