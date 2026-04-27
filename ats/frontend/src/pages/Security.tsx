import { useState } from "react";
import { useSessions } from "@/hooks/auth/useSessions";
import { SessionsList } from "@/components/security/SessionsList";
import { PasswordChangeForm } from "@/components/security/PasswordChangeForm";

const Security = () => {
  const { sessions, loading, revokeSession, revokeAllSessions, fetchSessions } =
    useSessions();
  const [activeTab, setActiveTab] = useState<"sessions" | "password">("sessions");

  return (
    <div className="security-page">
      <div className="security-container">
        <h1 className="security-title">Seguridad</h1>
        
        <div className="security-tabs">
          <button
            className={`security-tab ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            Sesiones Activas
          </button>
          <button
            className={`security-tab ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            Cambiar Contraseña
          </button>
        </div>

        {activeTab === "sessions" ? (
          <SessionsList
            sessions={sessions}
            loading={loading}
            onRevokeSession={revokeSession}
            onRevokeAllSessions={revokeAllSessions}
            onRefresh={fetchSessions}
          />
        ) : (
          <div className="password-change-container">
            <PasswordChangeForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;