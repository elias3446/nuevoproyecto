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
      const response = await api.get("/sessions/");
      setSessions(response.data.sessions || []);
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