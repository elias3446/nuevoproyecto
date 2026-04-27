import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePasswordResetConfirm } from "@/hooks/auth/usePasswordResetConfirm";
import { Loader2 } from "lucide-react";

interface PasswordResetConfirmFormProps {
  token: string;
}

export const PasswordResetConfirmForm = ({ token }: PasswordResetConfirmFormProps) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const { loading, validating, isValid, email, error, completed, handleReset } =
    usePasswordResetConfirm(token);

  if (completed) {
    return (
      <div className="password-reset-success">
        <div className="success-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="success-title">Contraseña Actualizada</h3>
        <p className="success-message">
          Tu contraseña ha sido cambiado correctamente.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="form-button-primary mt-6"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="password-reset-loading">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
        <p className="loading-text">Validando enlace...</p>
      </div>
    );
  }

  if (error || !isValid) {
    return (
      <div className="password-reset-error">
        <div className="error-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="error-title">Enlace Inválido</h3>
        <p className="error-message">{error || "El enlace ha expirado o ya fue utilizado"}</p>
        <button
          onClick={() => navigate("/password-reset")}
          className="form-button-primary mt-6"
        >
          Solicitar Nuevo Enlace
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      setLocalError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      await handleReset(password, confirmPassword);
    } catch {
      // Error ya manejado por el hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-group">
      <div className="reset-email-info">
        <p className="reset-email-label">Restableciendo contraseña para:</p>
        <p className="reset-email-value">{email}</p>
      </div>

      <div>
        <label className="form-label">Nueva Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
          placeholder="••••••••"
          disabled={validating}
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
          disabled={validating}
          minLength={8}
        />
      </div>

      {localError && <p className="form-error">{localError}</p>}

      <button
        type="submit"
        disabled={validating}
        className="form-button-primary"
      >
        {validating ? (
          <>
            <Loader2 className="animate-spin inline-block h-5 w-5 mr-2" />
            Cambiando...
          </>
        ) : (
          "Cambiar Contraseña"
        )}
      </button>
    </form>
  );
};

export default PasswordResetConfirmForm;