import React from "react";
import { useRegister } from "@/hooks/auth/useRegister";

const RegisterForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    handleRegister
  } = useRegister();

  return (
    <form onSubmit={handleRegister} className="form-group">
      <div>
        <label className="form-label">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
          placeholder="email@ejemplo.com"
        />
      </div>
      <div>
        <label className="form-label">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
          placeholder="••••••••"
          minLength={8}
        />
      </div>
      <div>
        <label className="form-label">Confirmar Contraseña</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="form-input"
          placeholder="••••••••"
          minLength={8}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="form-button-primary"
      >
        {loading ? "Creando cuenta..." : "Crear Cuenta"}
      </button>
    </form>
  );
};

export default RegisterForm;