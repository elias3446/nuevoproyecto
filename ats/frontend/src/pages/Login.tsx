import React from "react";
import { Link } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Iniciar Sesión</h2>
        <p className="auth-subtext">Ingresa tus credenciales para acceder</p>
        <LoginForm />
        <div className="auth-footer-links">
          <Link to="/password-reset" className="auth-footer-link">
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="auth-footer-divider">•</span>
          <Link to="/register" className="auth-footer-link">
            Crear Cuenta
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
