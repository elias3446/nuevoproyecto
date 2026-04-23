import React from "react";
import { useLogin } from "@/hooks/auth/useLogin";

const LoginForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    loading,
    handleLogin
  } = useLogin();

  return (
    <form onSubmit={handleLogin} className="form-group">
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
        />
      </div>
      <div className="form-checkbox">
        <input
          type="checkbox"
          id="rememberMe"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="form-checkbox-input"
        />
        <label htmlFor="rememberMe" className="form-checkbox-label">
          Recordar mi usuario por 30 días
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="form-button-primary"
      >
        {loading ? "Entrando..." : "Entrar al Sistema"}
      </button>
    </form>
  );
};

export default LoginForm;
