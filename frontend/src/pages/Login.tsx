import React from "react";
import LoginForm from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Iniciar Sesión</h2>
        <p className="auth-subtext">Ingresa tus credenciales para acceder</p>
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
