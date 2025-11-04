import { sendSignal, Signal } from './signaling';
import { showEncouragement, showError, showInfo } from './toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface PeerConnectionMap {
  [peerId: string]: RTCPeerConnection;
}

export class WebRTCMesh {
  private userId: string;
  private connections: PeerConnectionMap = {};
  private localStream: MediaStream | null = null;
  private onRemoteStream: (peerId: string, stream: MediaStream) => void;
  private onPeerDisconnected: (peerId: string) => void;
  private onDataChannelMessage: (peerId: string, message: string) => void;

  constructor(
    userId: string,
    onRemoteStream: (peerId: string, stream: MediaStream) => void,
    onPeerDisconnected: (peerId: string) => void,
    onDataChannelMessage: (peerId: string, message: string) => void
  ) {
    this.userId = userId;
    this.onRemoteStream = onRemoteStream;
    this.onPeerDisconnected = onPeerDisconnected;
    this.onDataChannelMessage = onDataChannelMessage;
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    // Update tracks for all existing connections
    Object.values(this.connections).forEach(pc => {
      pc.getSenders().forEach(sender => {
        pc.removeTrack(sender);
      });
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }
    });
  }

  private createPeerConnection(peerId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.connections[peerId] = pc;

    // 1. Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          senderId: this.userId,
          recipientId: peerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    // 2. Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStream(peerId, event.streams[0]);
      }
    };

    // 3. Handle connection state changes
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    // 4. Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // 5. Data Channel (for chat/pinning)
    if (isInitiator) {
      const dataChannel = pc.createDataChannel('chat');
      dataChannel.onopen = () => showEncouragement(`Chat channel opened with ${peerId.substring(0, 4)}`);
      dataChannel.onmessage = (event) => this.onDataChannelMessage(peerId, event.data);
    } else {
      pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = (event) => this.onDataChannelMessage(peerId, event.data);
      };
    }

    return pc;
  }

  public async handleNewPeer(peerId: string) {
    if (peerId === this.userId || this.connections[peerId]) return;

    showInfo(`Initiating connection with new peer: ${peerId.substring(0, 4)}`);
    const pc = this.createPeerConnection(peerId, true);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal({
        type: 'offer',
        senderId: this.userId,
        recipientId: peerId,
        data: pc.localDescription!.toJSON(),
      });
    } catch (error) {
      showError(`Failed to create offer for ${peerId.substring(0, 4)}`);
      console.error(error);
    }
  }

  public async handleSignal(signal: Signal) {
    const senderId = signal.senderId;
    let pc = this.connections[senderId];

    if (signal.type === 'offer') {
      if (!pc) {
        pc = this.createPeerConnection(senderId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal({
          type: 'answer',
          senderId: this.userId,
          recipientId: senderId,
          data: pc.localDescription!.toJSON(),
        });
      } catch (error) {
        showError(`Failed to handle offer from ${senderId.substring(0, 4)}`);
        console.error(error);
      }
    } else if (signal.type === 'answer') {
      if (pc && pc.signalingState !== 'closed') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
        } catch (error) {
          showError(`Failed to handle answer from ${senderId.substring(0, 4)}`);
          console.error(error);
        }
      }
    } else if (signal.type === 'candidate') {
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
        } catch (error) {
          console.error(`Error adding ICE candidate from ${senderId.substring(0, 4)}:`, error);
        }
      }
    }
  }

  public sendData(peerId: string, message: string) {
    const pc = this.connections[peerId];
    if (pc) {
      const dataChannel = pc.sctp?.transport?.transport?.dataChannels?.find(dc => dc.label === 'chat');
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(message);
      } else {
        console.warn(`Data channel not open for ${peerId.substring(0, 4)}`);
      }
    }
  }

  public broadcastData(message: string) {
    Object.keys(this.connections).forEach(peerId => {
      this.sendData(peerId, message);
    });
  }

  public removePeer(peerId: string) {
    const pc = this.connections[peerId];
    if (pc) {
      pc.close();
      delete this.connections[peerId];
      this.onPeerDisconnected(peerId);
      showInfo(`Peer ${peerId.substring(0, 4)} disconnected.`);
    }
  }

  public cleanup() {
    Object.values(this.connections).forEach(pc => pc.close());
    this.connections = {};
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  private sendSignal(signal: Signal) {
    sendSignal(signal);
  }
}