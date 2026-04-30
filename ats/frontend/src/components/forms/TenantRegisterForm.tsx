import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { publicApi } from "@/integrations/backend/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(2, "El nombre de la empresa debe tener al menos 2 caracteres"),
  subdomain: z.string().min(3, "El subdominio debe tener al menos 3 caracteres").regex(/^[a-zA-Z0-9]+$/, "Solo letras y números"),
  admin_email: z.string().email("Email inválido"),
  admin_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const TenantRegisterForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await publicApi.post("/tenants/register/", values);
      toast.success("Empresa registrada. Redirigiendo al login...");
      
      // Guardamos el subdominio para que el interceptor lo use
      localStorage.setItem('tenant_subdomain', values.subdomain);
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al registrar la empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Empresa</Label>
        <Input id="name" placeholder="Mi Empresa S.A." {...register("name")} />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subdomain">Subdominio / Identificador</Label>
        <div className="flex items-center space-x-2">
            <Input id="subdomain" placeholder="miempresa" {...register("subdomain")} />
            <span className="text-gray-400 text-sm">.ats.com</span>
        </div>
        {errors.subdomain && <p className="text-red-500 text-xs">{errors.subdomain.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin_email">Email del Administrador</Label>
        <Input id="admin_email" type="email" placeholder="admin@miempresa.com" {...register("admin_email")} />
        {errors.admin_email && <p className="text-red-500 text-xs">{errors.admin_email.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin_password">Contraseña</Label>
        <Input id="admin_password" type="password" {...register("admin_password")} />
        {errors.admin_password && <p className="text-red-500 text-xs">{errors.admin_password.message as string}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Registrando..." : "Registrar Empresa"}
      </Button>
    </form>
  );
};

export default TenantRegisterForm;
