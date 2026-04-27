import React from "react";
import { usePasswordResetRequest } from "@/hooks/auth/usePasswordResetRequest";

export const PasswordResetRequestForm = () => {
  const { email, setEmail, loading, success, handleRequest } =
    usePasswordResetRequest();

  if (success) {
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="success-title">Correo Enviado</h3>
        <p className="success-message">
          Si el correo electrónico que ingresaste existe en nuestro sistema,
          recibirás un enlace de recuperación en los próximos minutos.
        </p>
        <p className="success-note">
          Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleRequest} className="form-group">
      <div>
        <label className="form-label">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
          placeholder="tu@email.com"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading} className="form-button-primary">
        {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
      </button>
    </form>
  );
};

export default PasswordResetRequestForm;