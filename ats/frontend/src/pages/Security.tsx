import { useSearchParams } from "react-router-dom";
import { useSessions } from "@/hooks/auth/useSessions";
import { SessionsList } from "@/components/security/SessionsList";
import { PasswordChangeForm } from "@/components/security/PasswordChangeForm";
import { ExportManager } from "@/components/security/ExportManager";
import AccessControlModule from "@/components/security/AccessControlModule";
import { Shield, Key, Monitor, FileBarChart } from "lucide-react";

const Security = () => {
  const { sessions, loading, revokeSession, revokeAllSessions, fetchSessions } = useSessions();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "roles" | "sessions" | "password" | "exports") || "roles";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="security-page">
      <div className="security-container flex flex-col">
        <div className="security-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="security-title flex items-center gap-3">
              <div className="security-icon-wrapper">
                  <Shield className="h-8 w-8 text-blue-500" />
              </div>
              Centro de Seguridad
            </h1>
            <p className="security-desc text-gray-400">
              Administración avanzada de identidades, perfiles, sesiones y trazabilidad de la plataforma.
            </p>
          </div>
        </div>

        {/* Navegación Modular Estilizada */}
        <div className="security-tabs mb-6">
          {[
            { id: 'roles', label: 'Perfiles y Roles', icon: Shield },
            { id: 'sessions', label: 'Sesiones Activas', icon: Monitor },
            { id: 'password', label: 'Seguridad', icon: Key },
            { id: 'exports', label: 'Auditoría', icon: FileBarChart }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`security-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido Dinámico */}
        <div className="flex-1 pb-6">
          {activeTab === 'roles' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <AccessControlModule />
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SessionsList
                sessions={sessions}
                loading={loading}
                onRevokeSession={revokeSession}
                onRevokeAllSessions={revokeAllSessions}
                onRefresh={fetchSessions}
              />
            </div>
          )}
          
          {activeTab === 'password' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl mx-auto mt-8">
              <div className="password-change-container">
                <PasswordChangeForm />
              </div>
            </div>
          )}

          {activeTab === 'exports' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ExportManager />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Security;