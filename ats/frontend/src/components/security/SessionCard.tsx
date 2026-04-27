import { UserSession } from "@/hooks/auth/useSessions";

interface SessionCardProps {
  session: UserSession;
  onRevoke: (sessionId: number) => void;
  formatDate: (dateStr: string) => string;
}

const formatDate = (dateStr: string): string => {
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

const getLocation = (session: UserSession): string => {
  if (session.city && session.country && session.country !== 'XX') {
    return `${session.city}, ${session.country}`;
  }
  if (session.country && session.country !== 'XX') return session.country;
  return "Ubicación desconocida";
};

const isDeviceInfoValid = (info: UserSession['device_info']): boolean => {
  if (!info) return false;
  const browser = info.browser || '';
  const os = info.os || '';
  return browser !== 'Unknown' && browser !== '' && os !== 'Unknown' && os !== '';
};

const getDeviceName = (session: UserSession): string => {
  const info = session.device_info;
  if (!isDeviceInfoValid(info)) return "Dispositivo desconocido";
  return `${info.browser} · ${info.os}`;
};

export const SessionCard = ({ session, onRevoke }: SessionCardProps) => {
  const cardClass = session.is_suspicious
    ? "session-card session-card-suspicious"
    : session.is_current
    ? "session-card session-card-current"
    : "session-card session-card-normal";

  return (
    <div className={cardClass}>
      <div className="session-card-content">
        <div className="session-card-info">
          <div className="session-card-badges">
            {session.is_current && (
              <span className="session-badge session-badge-current">
                Este dispositivo
              </span>
            )}
            {session.is_suspicious && (
              <span className="session-badge session-badge-suspicious">
                Revisar
              </span>
            )}
          </div>
          <p className={isDeviceInfoValid(session.device_info) ? "session-info" : "session-unknown"}>{getDeviceName(session)}</p>
          <p className="session-details">
            {getLocation(session)} · IP: {session.ip_address}
          </p>
          <p className="session-time">{formatDate(session.last_used)}</p>
        </div>
        {!session.is_current && (
          <button
            onClick={() => onRevoke(session.id)}
            className="session-button-revoke"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
};

export const formatSessionDate = formatDate;