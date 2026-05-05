import { useState, useEffect } from "react";
import { UserSession } from "@/hooks/auth/useSessions";
import { SessionCard } from "./SessionCard";
import { toast } from "sonner";

interface SessionsListProps {
  sessions: UserSession[];
  loading: boolean;
  onRevokeSession: (sessionId: number) => Promise<boolean>;
  onRevokeAllSessions: () => Promise<boolean>;
  onRefresh: () => void;
}

export const SessionsList = ({
  sessions,
  loading,
  onRevokeSession,
  onRevokeAllSessions,
  onRefresh,
}: SessionsListProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [localSessions, setLocalSessions] = useState<UserSession[]>([]);
  const [revokingIds, setRevokingIds] = useState<number[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  useEffect(() => {
    // Filtrar sesiones que sabemos que estamos revocando para evitar que reaparezcan por lag de caché
    const filtered = sessions.filter(s => !revokingIds.includes(s.id));
    setLocalSessions(filtered);
    
    const current = sessions.find(s => s.is_current);
    if (current) setCurrentSessionId(current.id);
  }, [sessions, revokingIds]);

  const handleRevokeSession = async (sessionId: number) => {
    // Registrar que estamos revocando esta sesión para ignorar actualizaciones de caché
    setRevokingIds(prev => [...prev, sessionId]);
    
    const success = await onRevokeSession(sessionId);
    if (success) {
      toast.success("Sesion cerrada");
      if (sessionId === currentSessionId) {
        window.location.href = "/login";
      }
    } else {
      // Si falla, remover del filtro para que vuelva a aparecer
      setRevokingIds(prev => prev.filter(id => id !== sessionId));
      onRefresh();
      toast.error("Error al cerrar sesion");
    }
  };

  const handleRevokeAll = async () => {
    // Optimistic update
    setLocalSessions([]);
    
    const success = await onRevokeAllSessions();
    if (success) {
      toast.success("Todas las sesiones cerradas");
      window.location.href = "/login";
    } else {
      onRefresh();
      toast.error("Error al cerrar sesiones");
    }
    setShowConfirm(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="sessions-list-container">
      <div className="sessions-header">
        <h2 className="sessions-title">
          Sesiones Activas ({localSessions.length})
        </h2>
      </div>

      {localSessions.length === 0 ? (
        <p className="empty-message">No hay sesiones activas</p>
      ) : (
        <div className="sessions-list">
          {localSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onRevoke={handleRevokeSession}
              formatDate={(dateStr) => dateStr}
            />
          ))}
        </div>
      )}

      {localSessions.length > 1 && (
        <div className="sessions-actions">
          {showConfirm ? (
            <div className="session-actions">
              <button
                onClick={handleRevokeAll}
                className="confirm-button"
              >
                Confirmar cerrar todo
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="cancel-button"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="session-button-revoke"
            >
              Cerrar todas las demás sesiones
            </button>
          )}
        </div>
      )}
    </div>
  );
};