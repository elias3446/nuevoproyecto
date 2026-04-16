import React from "react";
import { useCreateSuperuser } from "@/hooks/auth/useCreateSuperuser";

const SuperuserSetupForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSubmit
  } = useCreateSuperuser();

  return (
    <form onSubmit={handleSubmit} className="form-group">
      <div>
        <label className="form-label">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
          placeholder="admin@tuempresa.com"
        />
      </div>
      
      <div>
        <label className="form-label">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="form-input"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="form-button-primary"
      >
        {loading ? "Creando..." : "Crear Superusuario y Acceder"}
      </button>
    </form>
  );
};

export default SuperuserSetupForm;
