import { clearTokens, getAccessToken } from './client';

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_BASE = `${WS_PROTOCOL}//${window.location.host}`;

type EventHandler = (data: any) => void;

class SessionNotifier {
  private ws: WebSocket | null = null;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private handlers: Map<string, EventHandler[]> = new Map();

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const handlers = this.handlers.get(data.type) || [];
      handlers.forEach(handler => handler(data));
      
      if (data.type === 'session_revoked') {
        this.handleSessionRevoked(data);
      } else if (data.type === 'token_expired') {
        this.handleTokenExpired(data);
      } else if (data.type === 'force_logout') {
        this.handleForceLogout(data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  private handleSessionRevoked = (data: any) => {
    console.warn('Sesión revocada:', data.session_id);
    clearTokens();
    window.location.href = '/login';
  };

  private handleTokenExpired = (data: any) => {
    console.warn('Token expirado');
    clearTokens();
    window.location.href = '/login';
  };

  private handleForceLogout = (data: any) => {
    console.warn('Logout forzado:', data.message);
    clearTokens();
    window.location.href = '/login';
  };

  private initWebSocket = () => {
    const token = getAccessToken();
    if (!token) {
      console.warn('No hay token, no se conecta al WebSocket');
      return;
    }

    const wsUrl = `${WS_BASE}/ws/notifications/?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket conectado');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = this.handleMessage;

      this.ws.onclose = () => {
        console.log('WebSocket desconectado');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
    }
  };

  private attemptReconnect = () => {
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.initWebSocket(), this.reconnectDelay);
    }
  };

  connect() {
    this.shouldReconnect = true;
    this.initWebSocket();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(eventType: string, handler: EventHandler) {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  off(eventType: string, handler: EventHandler) {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}

export const sessionNotifier = new SessionNotifier();
export default sessionNotifier;