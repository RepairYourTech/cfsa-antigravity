---
name: socketio
description: Build real-time communication features with Socket.io including namespaces, rooms, event handling, middleware, scaling with Redis adapter, and testing. Use when implementing WebSocket-based real-time features like chat, notifications, live updates, or collaborative editing.
version: 1.0.0
---

# Socket.io Realtime

Build real-time bidirectional communication with Socket.io. Socket.io provides WebSocket-based connections with automatic fallback to HTTP long-polling, reconnection, and room-based broadcasting.

## When to Use This Skill

- Implementing real-time chat systems
- Building live notifications and activity feeds
- Creating collaborative editing features
- Streaming live data (dashboards, stock tickers, game state)
- Building multiplayer or multi-user interactive experiences
- Implementing presence (online/offline indicators)

## Setup

```bash
# Server
pnpm add socket.io

# Client
pnpm add socket.io-client
```

## Server Setup

### Basic Server

```typescript
// src/server/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Connection settings
    pingInterval: 25000,      // How often to ping (ms)
    pingTimeout: 20000,       // How long to wait for pong (ms)
    maxHttpBufferSize: 1e6,   // Max message size (1MB)
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // Recover state within 2 minutes
      skipMiddlewares: false,
    },
  });

  return io;
}
```

### With Express

```typescript
import express from 'express';
import { createServer } from 'node:http';
import { createSocketServer } from './socket';

const app = express();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

registerEventHandlers(io);

httpServer.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### With NestJS

```typescript
// chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { room: string; text: string }) {
    this.server.to(payload.room).emit('message', {
      senderId: client.id,
      text: payload.text,
      timestamp: Date.now(),
    });
  }
}
```

## Client Setup

```typescript
// src/lib/socket-client.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.PUBLIC_WS_URL ?? 'http://localhost:3000', {
      autoConnect: false,       // Connect manually after auth
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      withCredentials: true,
      auth: {
        token: '', // Set before connecting
      },
    });
  }
  return socket;
}

export function connectSocket(token: string) {
  const s = getSocket();
  s.auth = { token };
  s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

### React Hook

```typescript
// src/hooks/useSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = connectSocket(token);

    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current;
}

export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
) {
  const socket = getSocket();

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
```

## Event Handling

### Server-Side Event Handlers

```typescript
// src/server/handlers/chat.ts
import type { Server, Socket } from 'socket.io';

interface ChatMessage {
  room: string;
  text: string;
  timestamp: number;
}

interface TypingEvent {
  room: string;
  userId: string;
  isTyping: boolean;
}

export function registerChatHandlers(io: Server, socket: Socket) {
  // Join a room
  socket.on('chat:join', async (roomId: string) => {
    await socket.join(roomId);
    const userId = socket.data.userId;

    // Notify others in the room
    socket.to(roomId).emit('chat:user-joined', {
      userId,
      roomId,
      timestamp: Date.now(),
    });
  });

  // Leave a room
  socket.on('chat:leave', async (roomId: string) => {
    await socket.leave(roomId);
    socket.to(roomId).emit('chat:user-left', {
      userId: socket.data.userId,
      roomId,
    });
  });

  // Send a message
  socket.on('chat:message', async (data: ChatMessage, callback) => {
    const message = {
      id: generateId(),
      userId: socket.data.userId,
      room: data.room,
      text: data.text,
      timestamp: Date.now(),
    };

    // Save to database
    await db.messages.create(message);

    // Broadcast to room (including sender)
    io.to(data.room).emit('chat:message', message);

    // Acknowledge receipt to sender
    callback({ status: 'ok', messageId: message.id });
  });

  // Typing indicator
  socket.on('chat:typing', (data: TypingEvent) => {
    socket.to(data.room).emit('chat:typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  });
}
```

### Registering Handlers

```typescript
// src/server/handlers/index.ts
import type { Server } from 'socket.io';
import { registerChatHandlers } from './chat';
import { registerPresenceHandlers } from './presence';
import { registerNotificationHandlers } from './notifications';

export function registerEventHandlers(io: Server) {
  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}, user: ${socket.data.userId}`);

    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerNotificationHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
```

## Acknowledgements

Acknowledgements provide request-response semantics over WebSockets.

```typescript
// Server
socket.on('file:upload', async (fileData: Buffer, metadata: FileMetadata, callback) => {
  try {
    const result = await uploadFile(fileData, metadata);
    callback({ status: 'ok', url: result.url });
  } catch (error) {
    callback({ status: 'error', message: error.message });
  }
});

// Client
socket.emit('file:upload', fileBuffer, metadata, (response) => {
  if (response.status === 'ok') {
    console.log('Uploaded:', response.url);
  } else {
    console.error('Upload failed:', response.message);
  }
});

// Client with timeout
socket.timeout(5000).emit('file:upload', fileBuffer, metadata, (err, response) => {
  if (err) {
    // Timeout or disconnection
    console.error('Request timed out');
  } else {
    console.log('Response:', response);
  }
});
```

## Namespaces

Namespaces separate concerns on a single connection.

```typescript
// Server
const chatNamespace = io.of('/chat');
const notificationsNamespace = io.of('/notifications');

chatNamespace.on('connection', (socket) => {
  // Only handles chat events
  socket.on('message', (data) => { /* ... */ });
});

notificationsNamespace.on('connection', (socket) => {
  // Only handles notification events
  socket.on('mark-read', (id) => { /* ... */ });
});

// Client
const chatSocket = io('http://localhost:3000/chat');
const notifSocket = io('http://localhost:3000/notifications');

chatSocket.emit('message', { text: 'Hello' });
notifSocket.emit('mark-read', notifId);
```

## Middleware

### Authentication Middleware

```typescript
// Server-side auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const user = await verifyToken(token);
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error('Invalid authentication token'));
  }
});

// Namespace-level middleware
chatNamespace.use(async (socket, next) => {
  // Additional middleware for chat namespace
  const userId = socket.data.userId;
  const canChat = await checkChatPermission(userId);
  if (!canChat) {
    return next(new Error('Chat access denied'));
  }
  next();
});
```

### Logging Middleware

```typescript
io.use((socket, next) => {
  const originalEmit = socket.emit;
  socket.emit = function (event: string, ...args: unknown[]) {
    console.log(`[OUT] ${socket.id} ${event}`);
    return originalEmit.apply(socket, [event, ...args]);
  };

  socket.onAny((event, ...args) => {
    console.log(`[IN] ${socket.id} ${event}`);
  });

  next();
});
```

## Broadcasting Patterns

```typescript
// To all connected clients
io.emit('announcement', { message: 'Server restarting in 5 minutes' });

// To all clients in a room (excluding sender)
socket.to('room-123').emit('message', data);

// To all clients in a room (including sender)
io.to('room-123').emit('message', data);

// To multiple rooms
io.to('room-1').to('room-2').emit('alert', data);

// To all except specific sockets
socket.broadcast.emit('user-joined', { userId: socket.data.userId });

// To a specific socket by ID
io.to(targetSocketId).emit('private-message', data);

// To all sockets of a specific user (multi-device)
io.to(`user:${userId}`).emit('notification', data);
// (Requires joining user-specific room on connect:
//  socket.join(`user:${socket.data.userId}`))
```

## Rooms for Presence

```typescript
// src/server/handlers/presence.ts
export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Join user-specific room for multi-device support
  socket.join(`user:${userId}`);

  // Track online status
  socket.on('presence:online', async () => {
    await redis.sadd('online-users', userId);
    io.emit('presence:update', { userId, status: 'online' });
  });

  socket.on('disconnect', async () => {
    // Check if user has other connected sockets
    const userSockets = await io.in(`user:${userId}`).fetchSockets();
    if (userSockets.length === 0) {
      await redis.srem('online-users', userId);
      io.emit('presence:update', { userId, status: 'offline' });
    }
  });
}
```

## Scaling with Redis Adapter

For multi-server deployments, use the Redis adapter to share state across instances.

```bash
pnpm add @socket.io/redis-adapter redis
```

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Now io.emit(), io.to(), rooms, etc. work across all server instances
```

## Error Handling

```typescript
// Server: Global error handler
io.engine.on('connection_error', (err) => {
  console.error('Connection error:', err.code, err.message);
});

// Per-socket error handler
socket.on('error', (error) => {
  console.error(`Socket ${socket.id} error:`, error);
});

// Client: Error handling
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication required') {
    // Redirect to login
    window.location.href = '/login';
  } else {
    console.error('Connection error:', error.message);
  }
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server intentionally disconnected -- reconnect manually
    socket.connect();
  }
  // Otherwise, socket.io will auto-reconnect
});
```

## Testing

```typescript
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Chat Socket', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: ClientSocket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;

      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: 'test-token' },
      });

      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.disconnect();
  });

  it('should receive messages in rooms', (done) => {
    serverSocket.join('test-room');

    serverSocket.on('chat:message', (data: any) => {
      expect(data.text).toBe('Hello');
      io.to('test-room').emit('chat:message', {
        id: '1',
        text: data.text,
        userId: 'test-user',
      });
    });

    clientSocket.on('chat:message', (msg) => {
      expect(msg.text).toBe('Hello');
      done();
    });

    clientSocket.emit('chat:message', { room: 'test-room', text: 'Hello' });
  });

  it('should acknowledge message receipt', (done) => {
    serverSocket.on('chat:message', (_data: any, callback: Function) => {
      callback({ status: 'ok', messageId: '123' });
    });

    clientSocket.emit('chat:message', { text: 'Test' }, (response: any) => {
      expect(response.status).toBe('ok');
      expect(response.messageId).toBe('123');
      done();
    });
  });
});
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Storing state in socket object properties | Use `socket.data` (typed) or external store (Redis) |
| Not validating incoming event payloads | Validate with Zod/schema before processing |
| Broadcasting sensitive data to all clients | Use rooms and namespaces to scope data delivery |
| Not handling reconnection on the client | Configure `reconnection`, `reconnectionAttempts`, and handle `reconnect` event |
| Using Socket.io for file transfer | Use HTTP for file uploads; Socket.io for signaling only |
| Not implementing heartbeats/presence checks | Socket.io has built-in ping/pong, but implement app-level presence |
| Emitting events without acknowledgements for critical operations | Use callbacks for operations that need confirmation |
| Running multiple Socket.io servers without Redis adapter | State (rooms, sockets) is not shared -- use Redis adapter |
