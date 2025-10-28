export const SIGNALING_SERVER_BASE_URL = "wss://REPLACE_ME_WITH_YOUR_ACTUAL_SIGNALING_SERVER_URL"; // IMPORTANT: Replace this placeholder with your deployed WebSocket server base URL (e.g., wss://my-deno-server.deno.dev)

export interface SignalingMessage {
  type: 'matchmaking' | 'offer' | 'answer' | 'ice-candidate' | 'room-found' | 'error';
  from?: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  roomId?: string;
  matchSize?: number;
  peers?: string[];
  error?: string;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private userId: string;
  private onMessage: (msg: SignalingMessage) => void;
  private onOpen?: () => void;
  private onClose?: () => void;

  constructor(userId: string, onMessage: (msg: SignalingMessage) => void, onOpen?: () => void, onClose?: () => void) {
    this.userId = userId;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
  }

  connect(matchSize: number) {
    if (this.ws) {
      this.ws.close();
    }
    
    // Construct the full WebSocket URL including the userId for identification
    const url = `${SIGNALING_SERVER_BASE_URL}/signal?userId=${this.userId}`;
    
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Signaling connected. Requesting match.");
      this.onOpen?.();
      
      // Request matchmaking
      this.send({
        type: 'matchmaking',
        from: this.userId,
        matchSize: matchSize,
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SignalingMessage = JSON.parse(event.data);
        this.onMessage(message);
      } catch (e) {
        console.error("Error parsing signaling message:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("Signaling disconnected.");
      this.onClose?.();
    };

    this.ws.onerror = (error) => {
      console.error("Signaling error:", error);
      this.onMessage({ type: 'error', error: 'Signaling connection failed. Ensure the server is running at ' + url });
    };
  }

  send(message: SignalingMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Message dropped:", message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}