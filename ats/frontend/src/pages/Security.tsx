import { useState } from "react";
import { Link } from "react-router-dom";
import { useSessions } from "@/hooks/auth/useSessions";
import { toast } from "sonner";

const Security = () => {
  const { sessions, loading, revokeSession, revokeAllSessions, fetchSessions } = useSessions();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRevokeSession = async (sessionId: number) => {
    const success = await revokeSession(sessionId);
    if (success) {
      toast.success("Sesión cerrada");
      fetchSessions();
    } else {
      toast.error("Error al cerrar sesión");
    }
  };

  const handleRevokeAll = async () => {
    const success = await revokeAllSessions();
    if (success) {
      toast.success("Todas las sesiones cerradas");
      window.location.href = "/login";
    } else {
      toast.error("Error al cerrar sesiones");
    }
    setShowConfirm(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const getLocation = (session: any) => {
    if (session.city && session.country) {
      return `${session.city}, ${session.country}`;
    }
    if (session.country) return session.country;
    return "Ubicación desconocida";
  };

  const getDeviceName = (session: any) => {
    const info = session.device_info;
    if (!info) return "Dispositivo desconocido";
    return `${info.browser || "Navegador"} · ${info.os || "SO"}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-400 hover:text-white">
            ← Volver
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">Seguridad</h1>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Sesiones Activas ({sessions.length})
            </h2>
          </div>

          {sessions.length === 0 ? (
            <p className="text-gray-400">No hay sesiones activas</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg bg-gray-900/50 border ${
                    session.is_suspicious
                      ? "border-yellow-600"
                      : session.is_current
                      ? "border-green-600"
                      : "border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {session.is_current && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                            Este dispositivo
                          </span>
                        )}
                        {session.is_suspicious && (
                          <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded">
                            ⚠️ Revisar
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium">
                        {getDeviceName(session)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {getLocation(session)} · IP: {session.ip_address}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {formatDate(session.last_used)}
                      </p>
                    </div>
                    {!session.is_current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sessions.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              {showConfirm ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleRevokeAll}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
                  >
                    Confirmar cerrar todo
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Cerrar todas las demás sesiones
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Security;