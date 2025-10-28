import { SignalingClient, SignalingMessage } from "./signaling";

export interface Peer {
  id: string;
  stream?: MediaStream;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private userId: string;
  private localStream: MediaStream | null = null;
  private peers: Map<string, Peer> = new Map();
  private signalingClient: SignalingClient;
  private onPeersUpdate: (peers: Peer[]) => void;
  private onTimerMessage: (message: any) => void;
  private iceCandidateBuffers: Map<string, RTCIceCandidate[]> = new Map();
  private isHost: boolean = false;

  constructor(
    userId: string,
    onPeersUpdate: (peers: Peer[]) => void,
    onTimerMessage: (message: any) => void,
    signalingClient: SignalingClient,
    isHost: boolean
  ) {
    this.userId = userId;
    this.onPeersUpdate = onPeersUpdate;
    this.onTimerMessage = onTimerMessage;
    this.signalingClient = signalingClient;
    this.isHost = isHost;

    this.signalingClient.onMessage = this.handleSignalingMessage.bind(this);
  }

  async initLocalStream() {
    try {
      // Request media access once, but keep tracks stopped initially
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false, // No audio required for silent study
      });
      
      // Stop all tracks initially, they will be enabled when added to PC and toggleVideo(true) is called
      this.localStream.getTracks().forEach(track => track.stop());
      
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      // Create an empty stream if media access fails
      this.localStream = new MediaStream();
      return this.localStream;
    }
  }
  
  private notifyPeersUpdate() {
    this.onPeersUpdate(Array.from(this.peers.values()));
  }

  private handleSignalingMessage(data: SignalingMessage) {
    switch (data.type) {
      case 'offer':
        this.handleOffer(data);
        break;
      case 'answer':
        this.handleAnswer(data);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(data);
        break;
      case 'error':
        console.error("Signaling Error:", data.error);
        break;
      // 'room-found' is handled in the main component before WebRTCManager is instantiated
    }
  }

  // --- Peer Connection Setup ---

  private createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const peer = this.peers.get(peerId);
      if (peer) {
        if (!peer.stream) {
          peer.stream = event.streams[0];
        } else {
          peer.stream.addTrack(event.track);
        }
        this.notifyPeersUpdate();
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.send({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
          to: peerId,
          from: this.userId,
        });
      }
    };
    
    // Handle Data Channel
    if (isInitiator) {
      const dataChannel = pc.createDataChannel("timer-sync");
      this.setupDataChannel(peerId, dataChannel);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }

    return pc;
  }
  
  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      console.log(`Data Channel opened with ${peerId}`);
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.dataChannel = dataChannel;
        this.notifyPeersUpdate();
      }
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onTimerMessage(message);
      } catch (e) {
        console.error("Error parsing DataChannel message:", e);
      }
    };
    
    dataChannel.onclose = () => {
      console.log(`Data Channel closed with ${peerId}`);
      // Handle peer disconnection
      this.peers.delete(peerId);
      this.notifyPeersUpdate();
    };
    
    // If this is the first time setting up the data channel for this peer, update the map
    const peer = this.peers.get(peerId);
    if (peer && !peer.dataChannel) {
        peer.dataChannel = dataChannel;
    }
  }

  // --- Signaling Handlers ---

  async startPeerConnection(peerId: string, isInitiator: boolean) {
    if (this.peers.has(peerId)) return;

    const pc = this.createPeerConnection(peerId, isInitiator);
    this.iceCandidateBuffers.set(peerId, []);
    
    // Placeholder peer object until data channel is fully set up
    this.peers.set(peerId, { id: peerId, peerConnection: pc } as Peer); 

    if (isInitiator) {
      await this.createOffer(peerId);
    }
  }

  private async createOffer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) return;

    const offer = await peer.peerConnection.createOffer();
    await peer.peerConnection.setLocalDescription(offer);

    this.signalingClient.send({
      type: 'offer',
      sdp: offer,
      to: peerId,
      from: this.userId,
    });
  }

  private async handleOffer(data: SignalingMessage) {
    const peerId = data.from!;
    
    // Ensure peer connection exists (it should be created by startPeerConnection if we are the host)
    if (!this.peers.has(peerId)) {
        await this.startPeerConnection(peerId, false);
    }
    
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection || !data.sdp) return;

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      
      // Process buffered ICE candidates
      this.processBufferedCandidates(peerId, peer.peerConnection);
      
      const answer = await peer.peerConnection.createAnswer();
      await peer.peerConnection.setLocalDescription(answer);

      this.signalingClient.send({
        type: 'answer',
        sdp: answer,
        to: peerId,
        from: this.userId,
      });
      
      this.notifyPeersUpdate();
    } catch (error) {
      console.error('Error handling offer from:', peerId, error);
    }
  }

  private async handleAnswer(data: SignalingMessage) {
    const peerId = data.from!;
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection || !data.sdp) return;

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      
      // Process buffered ICE candidates
      this.processBufferedCandidates(peerId, peer.peerConnection);
      
      this.notifyPeersUpdate();
    } catch (error) {
      console.error('Error handling answer from:', peerId, error);
    }
  }

  private async handleIceCandidate(data: SignalingMessage) {
    const peerId = data.from!;
    const peer = this.peers.get(peerId);
    
    if (!peer?.peerConnection || !data.candidate) return;

    const candidate = new RTCIceCandidate(data.candidate);
    
    if (!peer.peerConnection.remoteDescription) {
      const buffer = this.iceCandidateBuffers.get(peerId) || [];
      buffer.push(candidate);
      this.iceCandidateBuffers.set(peerId, buffer);
      return;
    }

    try {
      await peer.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate for:', peerId, error);
    }
  }
  
  private processBufferedCandidates(peerId: string, pc: RTCPeerConnection) {
    const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
    for (const candidate of bufferedCandidates) {
      pc.addIceCandidate(candidate).catch(e => {
        console.warn('Error adding buffered ICE candidate:', e);
      });
    }
    this.iceCandidateBuffers.set(peerId, []);
  }

  // --- Media Controls ---
  
  async toggleVideo(enable: boolean): Promise<boolean> {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    
    if (videoTrack) {
        videoTrack.enabled = enable;
    }
    
    return enable;
  }
  
  // --- Timer Sync ---
  
  sendTimerUpdate(remainingSeconds: number) {
    if (!this.isHost) return;
    
    const message = JSON.stringify({ type: "TIMER_UPDATE", remaining: remainingSeconds });
    
    this.peers.forEach(peer => {
      if (peer.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    });
  }

  // --- Cleanup ---

  disconnect() {
    this.signalingClient.disconnect();
    
    this.peers.forEach(peer => {
      peer.peerConnection.close();
    });

    if (this.localStream) {
      // Stop tracks to release camera/mic light
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.peers.clear();
  }
}