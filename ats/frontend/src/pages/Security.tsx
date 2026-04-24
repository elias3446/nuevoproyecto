import { useSessions } from "@/hooks/auth/useSessions";
import { SessionsList } from "@/components/security/SessionsList";

const Security = () => {
  const { sessions, loading, revokeSession, revokeAllSessions, fetchSessions } =
    useSessions();

  return (
    <div className="security-page">
      <div className="security-container">
        <h1 className="security-title">Seguridad</h1>
        <SessionsList
          sessions={sessions}
          loading={loading}
          onRevokeSession={revokeSession}
          onRevokeAllSessions={revokeAllSessions}
          onRefresh={fetchSessions}
        />
      </div>
    </div>
  );
};

export default Security;