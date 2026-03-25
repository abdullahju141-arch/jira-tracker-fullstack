/**
 * services/socketClient.ts  (UPDATED — connects to real backend)
 *
 * Real WS: ws://localhost:5000/ws?token=<JWT>&projectId=<id>
 * Set NEXT_PUBLIC_WS_URL in .env.local to override.
 * Falls back to mock events when useMock=true or no token.
 */

export type WSEventType =
  | 'issue.created' | 'issue.updated' | 'issue.deleted'
  | 'comment.added' | 'project.updated' | 'connected' | 'pong';

export interface WSMessage { type: WSEventType; payload: unknown; }
type MessageHandler = (msg: WSMessage) => void;

class SocketClient {
  private ws:           WebSocket | null = null;
  private handlers:     MessageHandler[] = [];
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(projectId: string, token: string | null, useMock = false) {
    this.disconnect();
    if (useMock || !token) { this.startMock(projectId); return; }

    const base = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    const url  = `${base}/ws?token=${encodeURIComponent(token)}&projectId=${encodeURIComponent(projectId)}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        console.log(`🔌 WS connected: project=${projectId}`);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
      };
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          if (msg.type === 'connected' || msg.type === 'pong') return;
          this.handlers.forEach(h => h(msg));
        } catch { /* ignore */ }
      };
      this.ws.onclose  = () => this.cleanup();
      this.ws.onerror  = () => { this.ws = null; this.startMock(projectId); };
    } catch { this.startMock(projectId); }
  }

  disconnect() { this.cleanup(); this.ws?.close(); this.ws = null; }

  private cleanup() {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
    if (this.mockInterval) { clearInterval(this.mockInterval); this.mockInterval = null; }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  private startMock(projectId: string) {
    this.mockInterval = setInterval(() => {
      const events: WSMessage[] = [
        { type: 'issue.updated', payload: { id: `${projectId}-mock`, projectId, title: '🔴 Live WS update (mock)', status: 'done', priority: 'high', labels: ['feature'], assigneeId: 'u1', version: 99, description: 'Mock WS event', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
        { type: 'comment.added', payload: { id: `ws-c-${Date.now()}`, issueId: `${projectId}-i3`, userId: 'u2', message: '💬 Real-time comment via WebSocket!', createdAt: new Date().toISOString() } },
      ];
      this.handlers.forEach(h => h(events[Math.floor(Math.random() * events.length)]));
    }, 15_000);
  }
}

export const socketClient = new SocketClient();
