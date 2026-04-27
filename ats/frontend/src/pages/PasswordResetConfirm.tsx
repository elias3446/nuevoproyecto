import { useParams, Navigate } from "react-router-dom";
import PasswordResetConfirmForm from "@/components/auth/PasswordResetConfirmForm";

const PasswordResetConfirm = () => {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return <Navigate to="/password-reset" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-header">Nueva Contraseña</h2>
        <p className="auth-subtext">
          Ingresa tu nueva contraseña para completar el proceso de recuperación
        </p>
        <PasswordResetConfirmForm token={token} />
      </div>
    </div>
  );
};

export default PasswordResetConfirm;