import React, { useState } from "react";
import { usePasswordChange } from "@/hooks/auth/usePasswordChange";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const PasswordChangeForm = () => {
  const { loading, handleChangePassword } = usePasswordChange();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      await handleChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
    } catch {
      // Error manejado por el hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="password-change-form">
      <div className="form-field">
        <label className="form-label">Contraseña Actual</label>
        <div className="password-input-wrapper">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="form-input pr-10"
            placeholder="••••••••"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="password-toggle"
          >
            {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Nueva Contraseña</label>
        <div className="password-input-wrapper">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="form-input pr-10"
            placeholder="••••••••"
            disabled={loading}
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="password-toggle"
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p className="field-hint">Mínimo 8 caracteres</p>
      </div>

      <div className="form-field">
        <label className="form-label">Confirmar Nueva Contraseña</label>
        <div className="password-input-wrapper">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="form-input pr-10"
            placeholder="••••••••"
            disabled={loading}
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="password-toggle"
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading} className="form-button-primary">
          {loading ? (
            <>
              <Loader2 className="animate-spin inline-block h-5 w-5 mr-2" />
              Cambiando...
            </>
          ) : (
            "Cambiar Contraseña"
          )}
        </button>
      </div>

      <p className="security-warning">
        Tras cambiar tu contraseña, todas tus sesiones serán cerradas y tendrás
        que iniciar sesión nuevamente.
      </p>
    </form>
  );
};

export default PasswordChangeForm;