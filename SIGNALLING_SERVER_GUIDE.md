# WebRTC Signaling Server Guide

The OnlyFocus application uses WebRTC for peer-to-peer video and data transfer, which requires an external WebSocket signaling server to coordinate connections between users.

**This server MUST be deployed externally (e.g., on Deno Deploy, Render, or a VPS) and its public WebSocket URL must replace the placeholder in `src/lib/signaling.ts`.**

## Minimal Deno Signaling Server Example

This is a basic example of a Deno server that handles matchmaking and signaling messages. You can deploy this to a Deno environment (like Deno Deploy).

### `signaling-server/main.ts`

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Map to store active WebSocket connections: userId -> WebSocket
const users = new Map<string, WebSocket>();

// Map to store rooms: roomId -> Set<userId>
const rooms = new Map<string, Set<string>>();

// Map to store pending matchmaking requests: matchSize -> Array<{ userId: string, ws: WebSocket }>
const matchmakingQueue = new Map<number, { userId: string, ws: WebSocket }[]>();

function broadcastRoomFound(roomId: string, peerIds: string[]) {
  const message = JSON.stringify({
    type: 'room-found',
    roomId: roomId,
    peers: peerIds,
  });

  peerIds.forEach(userId => {
    const ws = users.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
}

function handleMatchmaking(userId: string, matchSize: number, ws: WebSocket) {
  if (matchSize === 1) {
    // Solo mode: immediately create a room with just the user
    const roomId = crypto.randomUUID();
    rooms.set(roomId, new Set([userId]));
    broadcastRoomFound(roomId, [userId]);
    return;
  }

  const queue = matchmakingQueue.get(matchSize) || [];
  queue.push({ userId, ws });
  matchmakingQueue.set(matchSize, queue);

  console.log(`User ${userId} joined queue for size ${matchSize}. Current queue size: ${queue.length}`);

  if (queue.length >= matchSize) {
    // Match found!
    const matchedPeers = queue.splice(0, matchSize);
    const peerIds = matchedPeers.map(p => p.userId);
    const roomId = crypto.randomUUID();

    rooms.set(roomId, new Set(peerIds));
    
    // Remove matched users from the global queue map
    matchmakingQueue.set(matchSize, queue);

    console.log(`Match found for room ${roomId}: ${peerIds.join(', ')}`);
    broadcastRoomFound(roomId, peerIds);
  }
}

function handleSignaling(message: any) {
  const { to, from, type, sdp, candidate } = message;

  if (!to || !from) {
    console.error("Invalid signaling message: missing 'to' or 'from'");
    return;
  }

  const targetWs = users.get(to);

  if (targetWs && targetWs.readyState === targetWs.OPEN) {
    // Relay the message to the target peer
    targetWs.send(JSON.stringify({
      type,
      from,
      sdp,
      candidate,
    }));
  } else {
    console.warn(`Target user ${to} not found or connection closed.`);
  }
}

function handleWs(ws: WebSocket, req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    ws.close(1008, "Missing userId parameter.");
    return;
  }

  users.set(userId, ws);
  console.log(`User ${userId} connected.`);

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'matchmaking') {
        handleMatchmaking(userId, message.matchSize, ws);
      } else if (['offer', 'answer', 'ice-candidate'].includes(message.type)) {
        handleSignaling(message);
      } else {
        console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (e) {
      console.error("Error processing message:", e);
    }
  };

  ws.onclose = () => {
    console.log(`User ${userId} disconnected.`);
    users.delete(userId);
    
    // Simple cleanup: remove user from any matchmaking queues
    matchmakingQueue.forEach((queue, size) => {
      matchmakingQueue.set(size, queue.filter(p => p.userId !== userId));
    });
    
    // Note: Room cleanup is more complex and omitted for this minimal example.
  };
}

serve((req) => {
  const url = new URL(req.url);

  if (url.pathname === "/signal") {
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      handleWs(socket, req);
      return response;
    }
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  return new Response("Not Found", { status: 404 });
});