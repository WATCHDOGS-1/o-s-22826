// WebRTC utilities for video calling
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";


export interface Peer {
  id: string;
  displayName: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  videoSender?: RTCRtpSender; // Track the video sender for replacement
}

export class WebRTCManager {
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, Peer> = new Map();
  private iceCandidateBuffers: Map<string, RTCIceCandidate[]> = new Map();
  private roomId: string = '';
  private userId: string = '';
  private displayName: string = '';
  private onPeersUpdate?: (peers: Peer[]) => void;
  private wasVideoEnabled: boolean = false;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(
    roomId: string,
    userId: string,
    displayName: string,
    onPeersUpdate?: (peers: Peer[]) => void
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.displayName = displayName;
    this.onPeersUpdate = onPeersUpdate;
  }

  async init() {
    try {
      this.localStream = new MediaStream();
      this.wasVideoEnabled = false;

      this.setupVisibilityHandler();

      this.channel = supabase.channel(`webrtc:${this.roomId}`, {
        config: { 
          presence: { key: this.userId },
          broadcast: { self: false, ack: true }
        },
      });

      this.channel
        .on('presence', { event: 'join' }, async ({ newPresences }) => {
          for (const p of newPresences) {
            if (p.userId !== this.userId) {
              await this.ensurePeerConnection(p.userId, p.displayName);
              await this.createOffer(p.userId);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          for (const p of leftPresences) {
            this.handleUserLeft({ userId: p.userId });
          }
        })
        .on('presence', { event: 'sync' }, async () => {
          const state: Record<string, any[]> = this.channel!.presenceState() as any;
          const allPresences = Object.values(state).flat();
          
          for (const p of allPresences) {
            if (p.userId !== this.userId && !this.peers.has(p.userId)) {
              await this.ensurePeerConnection(p.userId, p.displayName);
              await this.createOffer(p.userId);
            }
          }
          this.notifyPeersUpdate();
        })
        .on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
          if (payload?.to && payload.to !== this.userId) return;
          await this.handleSignalingMessage(payload);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.channel!.track({ userId: this.userId, displayName: this.displayName });
          }
        });

      return this.localStream;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }

  private setupVisibilityHandler() {
    this.visibilityChangeHandler = () => {
      // Keep connections alive in background
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private async handleSignalingMessage(data: any) {
    switch (data.type) {
      case 'offer':
        await this.handleOffer(data);
        break;
      case 'answer':
        await this.handleAnswer(data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(data);
        break;
    }
  }

  private handleUserLeft(data: any) {
    const peer = this.peers.get(data.userId);
    if (peer?.peerConnection) {
      peer.peerConnection.close();
    }
    this.peers.delete(data.userId);
    this.iceCandidateBuffers.delete(data.userId);
    this.notifyPeersUpdate();
  }

  private async ensurePeerConnection(peerId: string, displayName: string) {
    if (this.peers.has(peerId) && this.peers.get(peerId)?.peerConnection) {
      return;
    }

    console.log('Creating peer connection for:', peerId);
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
    });

    const peer: Peer = {
      id: peerId,
      displayName: displayName || 'Anonymous',
      peerConnection: peerConnection,
    };

    // Add existing local tracks and store the sender
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'video') {
          peer.videoSender = peerConnection.addTrack(track, this.localStream!);
        } else {
          peerConnection.addTrack(track, this.localStream!);
        }
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      const currentPeer = this.peers.get(peerId);
      if (currentPeer) {
        // Mute remote audio tracks
        if (event.track.kind === 'audio') {
          event.track.enabled = false;
        }
        
        // Ensure stream is correctly associated
        let remoteStream = event.streams.length > 0 ? event.streams[0] : currentPeer.stream;
        if (!remoteStream) {
          remoteStream = new MediaStream([event.track]);
        } else if (!remoteStream.getTrackById(event.track.id)) {
          remoteStream.addTrack(event.track);
        }
        
        currentPeer.stream = remoteStream;
        this.notifyPeersUpdate();
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'webrtc',
          payload: {
            type: 'ice-candidate',
            candidate: event.candidate,
            to: peerId,
            from: this.userId,
          },
        });
      }
    };
    
    // Update peer map
    this.peers.set(peerId, peer);
    this.iceCandidateBuffers.set(peerId, []);
  }

  private async createOffer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection || !this.channel) return;

    try {
      const offer = await peer.peerConnection.createOffer();
      await peer.peerConnection.setLocalDescription(offer);

      this.channel.send({
        type: 'broadcast',
        event: 'webrtc',
        payload: {
          type: 'offer',
          offer,
          to: peerId,
          from: this.userId,
          displayName: this.displayName,
        },
      });
    } catch (error) {
      console.error('Error creating offer for:', peerId, error);
    }
  }

  private async handleOffer(data: any) {
    const peerId = data.from;
    
    await this.ensurePeerConnection(peerId, data.displayName);

    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) return;

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
      for (const candidate of bufferedCandidates) {
        await peer.peerConnection.addIceCandidate(candidate);
      }
      this.iceCandidateBuffers.set(peerId, []);
      
      const answer = await peer.peerConnection.createAnswer();
      await peer.peerConnection.setLocalDescription(answer);

      this.channel?.send({
        type: 'broadcast',
        event: 'webrtc',
        payload: {
          type: 'answer',
          answer,
          to: peerId,
          from: this.userId,
        },
      });
      
      this.notifyPeersUpdate();
    } catch (error) {
      console.error('Error handling offer from:', peerId, error);
    }
  }

  private async handleAnswer(data: any) {
    const peerId = data.from;
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) return;

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
      for (const candidate of bufferedCandidates) {
        await peer.peerConnection.addIceCandidate(candidate);
      }
      this.iceCandidateBuffers.set(peerId, []);
      
      this.notifyPeersUpdate();
    } catch (error) {
      console.error('Error handling answer from:', peerId, error);
    }
  }

  private async handleIceCandidate(data: any) {
    const peerId = data.from;
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) return;

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

  private notifyPeersUpdate() {
    if (this.onPeersUpdate) {
      this.onPeersUpdate(Array.from(this.peers.values()));
    }
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private async triggerRenegotiation() {
    // Trigger offer/answer cycle for all peers
    for (const peerId of this.peers.keys()) {
      await this.createOffer(peerId);
    }
  }

  async toggleVideo() {
    if (!this.localStream) return false;
    
    const existingVideoTrack = this.localStream.getVideoTracks()[0];
    
    if (existingVideoTrack) {
      // Turn OFF: stop track and remove it
      existingVideoTrack.stop();
      this.localStream.removeTrack(existingVideoTrack);
      
      // Update peer connections to remove video track (replace with null)
      this.peers.forEach(peer => {
        if (peer.videoSender) {
          peer.videoSender.replaceTrack(null);
        }
      });
      
      this.wasVideoEnabled = false;
      await this.triggerRenegotiation();
      return false;
    } else {
      // Turn ON: get new video stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false // We don't want audio here, only video
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        this.localStream.addTrack(newVideoTrack);
        
        // Update peer connections - replace track or add new sender
        this.peers.forEach(peer => {
          if (!peer.peerConnection) return;
          
          if (peer.videoSender) {
            // Replace existing (possibly null) video track
            peer.videoSender.replaceTrack(newVideoTrack);
          } else {
            // Add new video track and store the sender
            peer.videoSender = peer.peerConnection.addTrack(newVideoTrack, this.localStream!);
          }
        });
        
        this.wasVideoEnabled = true;
        await this.triggerRenegotiation();
        return true;
      } catch (error) {
        console.error('Error starting video:', error);
        this.wasVideoEnabled = false;
        return false;
      }
    }
  }

  async toggleAudio() {
    // Audio feature removed
    return false;
  }

  disconnect() {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    this.peers.forEach(peer => {
      peer.peerConnection?.close();
    });

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.peers.clear();
  }
}