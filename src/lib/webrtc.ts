// WebRTC utilities for video calling
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";


export interface Peer {
  id: string;
  displayName: string;
  stream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export class WebRTCManager {
  private socket: WebSocket | null = null; // legacy, unused
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
      // Create an empty MediaStream to start. User will enable camera manually.
      this.localStream = new MediaStream();
      
      // Track initial state
      this.wasVideoEnabled = false;

      // Setup track ended handlers (will be empty initially, but good to have)
      this.setupTrackEndedHandlers();

      // Setup page visibility handler
      this.setupVisibilityHandler();

      // Setup Supabase Realtime channel for signaling
      this.channel = supabase.channel(`webrtc:${this.roomId}`, {
        config: { 
          presence: { key: this.userId },
          broadcast: { self: false, ack: true }
        },
      });

      this.channel
        .on('presence', { event: 'join' }, async ({ newPresences }) => {
          console.log('Presence join event, new presences:', newPresences);
          for (const p of newPresences) {
            if (p.userId !== this.userId) {
              console.log('New user joining:', p.userId);
              await this.handleUserJoined({ userId: p.userId, displayName: p.displayName });
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          for (const p of leftPresences) {
            this.handleUserLeft({ userId: p.userId });
          }
        })
        .on('presence', { event: 'sync' }, async () => {
          console.log('Presence sync event');
          const state: Record<string, any[]> = this.channel!.presenceState() as any;
          const allPresences = Object.values(state).flat();
          console.log('All presences:', allPresences.map(p => p.userId));
          
          for (const p of allPresences) {
            if (p.userId !== this.userId && !this.peers.has(p.userId)) {
              console.log('Creating connection to existing peer:', p.userId);
              this.peers.set(p.userId, { id: p.userId, displayName: p.displayName || 'Anonymous' });
              this.iceCandidateBuffers.set(p.userId, []);
              // Create connection to existing peers
              await this.createPeerConnection(p.userId);
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
            console.log('Joined signaling channel');
          }
        });

      return this.localStream;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      throw error;
    }
  }

  private setupTrackEndedHandlers() {
    if (!this.localStream) return;

    this.localStream.getTracks().forEach(track => {
      track.onended = () => {
        console.warn(`Track ended unexpectedly: ${track.kind} - ${track.label}`);
        // Track ended, likely due to browser suspending it
        // We'll handle restart in visibility change handler
      };
    });
  }

  private setupVisibilityHandler() {
    // Simplified visibility handler - keep connections alive like Google Meet
    // WebRTC will maintain connections in background automatically
    this.visibilityChangeHandler = async () => {
      if (!document.hidden) {
        console.log('Tab returned to foreground - connection maintained');
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  private async restartTracksIfNeeded() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];

    // Check if video track ended
    if (videoTrack && videoTrack.readyState === 'ended' && this.wasVideoEnabled) {
      console.log('Restarting video track after tab became visible');
      try {
        // Restart camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        this.localStream.removeTrack(videoTrack);
        videoTrack.stop(); // Ensure old track is fully stopped
        this.localStream.addTrack(newVideoTrack);
        
        // Setup ended handler for new track
        newVideoTrack.onended = () => {
          console.warn('Video track ended unexpectedly');
        };
        
        // Update peer connections
        this.peers.forEach(peer => {
          const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(e => {
              console.error('Error replacing video track:', e);
            });
          }
        });
        
        console.log('Video track restarted successfully');
      } catch (error) {
        console.error('Error restarting video track:', error);
      }
    }

    // No audio track handling - mic is disabled
  }

  private joinRoom() {
    if (!this.socket) return;

    this.socket.send(JSON.stringify({
      type: 'join',
      roomId: this.roomId,
      userId: this.userId,
      displayName: this.displayName
    }));
  }

  private async handleSignalingMessage(data: any) {
    switch (data.type) {
      case 'user-joined':
        await this.handleUserJoined(data);
        break;
      case 'user-left':
        this.handleUserLeft(data);
        break;
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

  private async handleUserJoined(data: any) {
    console.log('User joined:', data.userId);

    // Don't create connection to ourselves
    if (data.userId === this.userId) {
      console.log('Ignoring self join event');
      return;
    }

    // Check if peer already exists
    if (this.peers.has(data.userId)) {
      console.log('Peer already exists:', data.userId);
      return;
    }

    const peer: Peer = {
      id: data.userId,
      displayName: data.displayName || 'Anonymous'
    };

    this.peers.set(data.userId, peer);
    this.iceCandidateBuffers.set(data.userId, []);
    
    // Create peer connection and offer with retry
    try {
      await this.createPeerConnection(data.userId);
      await this.createOffer(data.userId);
      console.log('Successfully created peer connection and offer for:', data.userId);
    } catch (error) {
      console.error('Error creating connection for:', data.userId, error);
      this.peers.delete(data.userId);
      this.iceCandidateBuffers.delete(data.userId);
    }
    
    this.notifyPeersUpdate();
  }

  private handleUserLeft(data: any) {
    console.log('User left:', data.userId);
    
    const peer = this.peers.get(data.userId);
    if (peer?.peerConnection) {
      peer.peerConnection.close();
    }
    
    this.peers.delete(data.userId);
    this.notifyPeersUpdate();
  }

  private async createPeerConnection(peerId: string) {
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
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    });

    // Add local stream tracks
    if (this.localStream && this.localStream.getTracks().length > 0) {
      console.log('Adding local tracks to peer connection:', peerId);
      this.localStream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind, track.label);
        peerConnection.addTrack(track, this.localStream!);
      });
    } else {
      console.warn('No local tracks to add for peer:', peerId);
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', peerId, 'kind:', event.track.kind);
      
      // Disable all audio tracks from remote peers - no one should hear anyone
      if (event.track.kind === 'audio') {
        event.track.enabled = false;
        console.log('Muted audio track from peer:', peerId);
      }
      
      const peer = this.peers.get(peerId);
      if (peer) {
        if (!peer.stream) {
          peer.stream = event.streams[0];
          console.log('Set remote stream for peer:', peerId);
        } else {
          // Add track to existing stream
          peer.stream.addTrack(event.track);
          console.log('Added track to existing stream for peer:', peerId);
        }
        this.notifyPeersUpdate();
      }
    };

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.error('Connection failed for peer:', peerId);
        // Attempt to restart ICE
        peerConnection.restartIce();
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${peerId}:`, peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'failed') {
        console.error('ICE connection failed for peer:', peerId);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.channel) {
        console.log('Sending ICE candidate to:', peerId, 'type:', event.candidate.type);
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
      } else if (!event.candidate) {
        console.log('ICE gathering complete for:', peerId);
      }
    };

    const peer = this.peers.get(peerId);
    if (peer) {
      peer.peerConnection = peerConnection;
    }
  }

  private async createOffer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection || !this.channel) return;

    const offer = await peer.peerConnection.createOffer();
    await peer.peerConnection.setLocalDescription(offer);

    console.log('Sending offer to:', peerId);
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
  }

  private async handleOffer(data: any) {
    const peerId = data.from;
    console.log('Received offer from:', peerId);
    
    // Create peer if doesn't exist
    if (!this.peers.has(peerId)) {
      console.log('Creating new peer entry for:', peerId);
      this.peers.set(peerId, {
        id: peerId,
        displayName: data.displayName || 'Anonymous'
      });
      this.iceCandidateBuffers.set(peerId, []);
    }

    await this.createPeerConnection(peerId);

    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) {
      console.error('Failed to create peer connection for:', peerId);
      return;
    }

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('Set remote description from offer for:', peerId);
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
      console.log(`Processing ${bufferedCandidates.length} buffered ICE candidates for:`, peerId);
      for (const candidate of bufferedCandidates) {
        try {
          await peer.peerConnection.addIceCandidate(candidate);
        } catch (e) {
          console.warn('Error adding buffered ICE candidate:', e);
        }
      }
      this.iceCandidateBuffers.set(peerId, []);
      
      const answer = await peer.peerConnection.createAnswer();
      await peer.peerConnection.setLocalDescription(answer);

      console.log('Sending answer to:', peerId);
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
    console.log('Received answer from:', peerId);
    
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) {
      console.error('No peer connection found for:', peerId);
      return;
    }

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Set remote description from answer for:', peerId);
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
      console.log(`Processing ${bufferedCandidates.length} buffered ICE candidates for:`, peerId);
      for (const candidate of bufferedCandidates) {
        try {
          await peer.peerConnection.addIceCandidate(candidate);
        } catch (e) {
          console.warn('Error adding buffered ICE candidate:', e);
        }
      }
      this.iceCandidateBuffers.set(peerId, []);
      
      this.notifyPeersUpdate();
    } catch (error) {
      console.error('Error handling answer from:', peerId, error);
    }
  }

  private async handleIceCandidate(data: any) {
    const peerId = data.from;
    console.log('Received ICE candidate from:', peerId, 'type:', data.candidate.type);
    
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) {
      console.warn('No peer connection for ICE candidate from:', peerId);
      return;
    }

    const candidate = new RTCIceCandidate(data.candidate);
    
    // If remote description isn't set yet, buffer the candidate
    if (!peer.peerConnection.remoteDescription) {
      console.log('Buffering ICE candidate for:', peerId);
      const buffer = this.iceCandidateBuffers.get(peerId) || [];
      buffer.push(candidate);
      this.iceCandidateBuffers.set(peerId, buffer);
      return;
    }

    try {
      await peer.peerConnection.addIceCandidate(candidate);
      console.log('Added ICE candidate for:', peerId);
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

  private async renegotiate(peerId: string) {
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
      console.error('Error renegotiating with peer:', peerId, error);
    }
  }

  async toggleVideo() {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    
    // If track exists and is enabled, turn it OFF
    if (videoTrack) {
      // 1. Stop the track immediately to turn off the camera light
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      
      console.log('Video track stopped and removed');
      
      // 2. Update peer connections to remove video
      this.peers.forEach(peer => {
        const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(null);
        }
      });
      
      this.wasVideoEnabled = false;
      return false;
    } else {
      // Turn ON: get new video stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        this.localStream.addTrack(newVideoTrack);
        
        // Update peer connections - add or replace track
        const peersNeedingRenegotiation: string[] = [];
        this.peers.forEach((peer, peerId) => {
          if (!peer.peerConnection) return;
          
          const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            // If no sender exists yet, add the track and mark for renegotiation
            peer.peerConnection.addTrack(newVideoTrack, this.localStream!);
            peersNeedingRenegotiation.push(peerId);
          }
        });
        
        // Renegotiate with peers that needed new tracks added
        for (const peerId of peersNeedingRenegotiation) {
          await this.renegotiate(peerId);
        }
        
        this.wasVideoEnabled = true;
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
    // Remove visibility handler
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    // Stop local stream tracks explicitly
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('Stopping track on disconnect:', track.kind, track.label);
        track.stop();
      });
      this.localStream = null;
    }

    // Close all peer connections
    this.peers.forEach(peer => {
      peer.peerConnection?.close();
    });

    // Leave signaling channel
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.peers.clear();
  }
}