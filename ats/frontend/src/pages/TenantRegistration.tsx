import React from "react";
import TenantRegisterForm from "@/components/forms/TenantRegisterForm";
import { Link } from "react-router-dom";

const TenantRegistration = () => {
  return (
    <div className="auth-page">
      <div className="auth-card max-w-lg">
        <h2 className="auth-header">Registrar Nueva Empresa</h2>
        <p className="auth-subtext text-blue-400">Comienza a usar la plataforma ATS para tu organización</p>
        
        <div className="mt-6">
            <TenantRegisterForm />
        </div>

        <div className="auth-footer">
          <span className="auth-footer-text">¿Ya eres cliente? </span>
          <Link to="/login" className="auth-footer-link">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TenantRegistration;
