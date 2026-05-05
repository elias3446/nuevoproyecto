import { useState, useEffect } from "react";
import { api } from "@/integrations/backend/client";

export interface UserSession {
  id: number;
  device_info: {
    browser: string;
    os: string;
    device: string;
    raw: string;
  };
  ip_address: string;
  country: string;
  city: string;
  user_agent: string;
  is_current: boolean;
  is_suspicious: boolean;
  last_used: string;
  created_at: string;
}

export const useSessions = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Añadimos un timestamp para evitar cache del navegador y asegurar datos frescos
      const response = await api.get(`/sessions/?_t=${Date.now()}`);
      const data = response.data;
      
      let finalSessions: UserSession[] = [];
      
      if (Array.isArray(data)) {
        finalSessions = data;
      } else if (data && typeof data === 'object') {
        // Buscar en múltiples posibles llaves (compatibilidad total)
        const possibleList = data.sessions || data.results || data;
        finalSessions = Array.isArray(possibleList) ? possibleList : [];
      }
      
      setSessions(finalSessions);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar sesiones");
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: number) => {
    try {
      await api.delete(`/sessions/${sessionId}/`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (err: any) {
      return false;
    }
  };

  const revokeAllSessions = async () => {
    try {
      await api.post("/logout-all/");
      setSessions([]);
      return true;
    } catch (err: any) {
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();

    // Suscribirse a actualizaciones vía WebSocket
    const handleRefresh = () => {
      console.log("Refrescando sesiones por notificación remota...");
      fetchSessions();
    };

    const socket = import("@/integrations/backend/socket").then(m => m.default);
    
    socket.then(s => {
      s.on("session_list_refresh", handleRefresh);
      s.on("session_revoked_update", handleRefresh);
    });

    return () => {
      socket.then(s => {
        s.off("session_list_refresh", handleRefresh);
        s.off("session_revoked_update", handleRefresh);
      });
    };
  }, []);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
  };
};