import { useSearchParams } from "react-router-dom";
import { useSessions } from "@/hooks/auth/useSessions";
import { SessionsList } from "@/components/security/SessionsList";
import { PasswordChangeForm } from "@/components/security/PasswordChangeForm";
import { ExportManager } from "@/components/security/ExportManager";

const Security = () => {
  const { sessions, loading, revokeSession, revokeAllSessions, fetchSessions } =
    useSessions();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "sessions" | "password" | "exports") || "sessions";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

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
          <button
            className={`security-tab ${activeTab === "exports" ? "active" : ""}`}
            onClick={() => setActiveTab("exports")}
          >
            Logs y Exportaciones
          </button>
        </div>

        {activeTab === "sessions" && (
          <SessionsList
            sessions={sessions}
            loading={loading}
            onRevokeSession={revokeSession}
            onRevokeAllSessions={revokeAllSessions}
            onRefresh={fetchSessions}
          />
        )}
        
        {activeTab === "password" && (
          <div className="password-change-container">
            <PasswordChangeForm />
          </div>
        )}

        {activeTab === "exports" && (
          <div className="export-manager-container mt-6">
            <ExportManager />
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;