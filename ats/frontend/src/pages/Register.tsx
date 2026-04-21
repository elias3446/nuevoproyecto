import React from "react";
import RegisterForm from "@/components/forms/RegisterForm";
import { Link } from "react-router-dom";

const Register = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Crear Cuenta</h2>
        <p className="auth-subtext">Ingresa tus datos para registrarte</p>
        <RegisterForm />
        <div className="auth-footer">
          <span className="auth-footer-text">¿Ya tienes cuenta? </span>
          <Link to="/login" className="auth-footer-link">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;