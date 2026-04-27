import { Link } from "react-router-dom";
import PasswordResetRequestForm from "@/components/auth/PasswordResetRequestForm";

const PasswordResetRequest = () => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Recuperar Contraseña</h2>
        <p className="auth-subtext">
          Ingresa tu correo electrónico y te enviaremos un enlace para recuperar tu contraseña
        </p>
        <PasswordResetRequestForm />
        <div className="auth-footer">
          <span className="auth-footer-text">¿Recordaste tu contraseña? </span>
          <Link to="/login" className="auth-footer-link">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;