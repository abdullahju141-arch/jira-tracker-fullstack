// src/sockets/wsServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import type { WSMessage } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface AuthenticatedWS extends WebSocket {
  userId:    string;
  userRole:  string;
  projectId: string;
  isAlive:   boolean;
}

// ── In-memory rooms: projectId → Set<AuthenticatedWS> ─────────────────────────
const rooms = new Map<string, Set<AuthenticatedWS>>();

export function getRoomSize(projectId: string): number {
  return rooms.get(projectId)?.size ?? 0;
}

/**
 * Broadcast a message to all authenticated clients in a project room.
 * Called from HTTP controllers after a successful mutation.
 */
export function broadcast(projectId: string, message: WSMessage): void {
  const room = rooms.get(projectId);
  if (!room || room.size === 0) return;

  const payload = JSON.stringify(message);
  room.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Initialize the WebSocket server attached to an existing HTTP server.
 *
 * Connection handshake: client sends JWT token in the URL query string
 *   ws://localhost:5000/ws?token=<JWT>&projectId=<id>
 *
 * After connecting the client may optionally send:
 *   { type: "ping" }  → server replies { type: "pong" }
 */
export function initWSServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const socket = ws as AuthenticatedWS;

    // ── Parse query params ───────────────────────────────────────────────────
    const url       = new URL(req.url ?? '', `http://localhost`);
    const token     = url.searchParams.get('token');
    const projectId = url.searchParams.get('projectId');

    if (!token || !projectId) {
      socket.close(4001, 'Missing token or projectId');
      return;
    }

    // ── Authenticate ─────────────────────────────────────────────────────────
    try {
      const decoded      = verifyAccessToken(token);
      socket.userId      = decoded.id;
      socket.userRole    = decoded.role;
      socket.projectId   = projectId;
      socket.isAlive     = true;
    } catch {
      socket.close(4003, 'Invalid or expired token');
      return;
    }

    // ── Join room ─────────────────────────────────────────────────────────────
    if (!rooms.has(projectId)) rooms.set(projectId, new Set());
    rooms.get(projectId)!.add(socket);

    console.log(
      `🔌 WS connected: user=${socket.userId} project=${projectId} room_size=${getRoomSize(projectId)}`
    );

    // Confirm connection to the client
    socket.send(JSON.stringify({
      type:    'connected',
      payload: { projectId, roomSize: getRoomSize(projectId) },
    }));

    // ── Heartbeat ─────────────────────────────────────────────────────────────
    socket.on('pong', () => { socket.isAlive = true; });

    // ── Incoming messages ─────────────────────────────────────────────────────
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string };
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch { /* ignore malformed */ }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('close', () => {
      const room = rooms.get(socket.projectId);
      if (room) {
        room.delete(socket);
        if (room.size === 0) rooms.delete(socket.projectId);
      }
      console.log(`🔌 WS disconnected: user=${socket.userId} project=${socket.projectId}`);
    });

    socket.on('error', (err) => {
      console.error('WS error:', err.message);
    });
  });

  // ── Heartbeat interval: terminate stale connections every 30s ────────────────
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedWS;
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('📡 WebSocket server initialized on /ws');
  return wss;
}
