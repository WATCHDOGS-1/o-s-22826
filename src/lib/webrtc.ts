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
  private channel: RealtimeChannel | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, Peer> = new Map();
  private iceCandidateBuffers: Map<string, RTCIceCandidate[]> = new Map();
  private roomId: string = '';
  private userId: string = '';
  private displayName: string = '';
  private onPeersUpdate?: (peers: Peer[]) => void;
  private wasVideoEnabledBeforeScreenShare: boolean = false;
  private wasVideoEnabled: boolean = false;
  private wasScreenSharing: boolean = false;
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
      // Start with an empty stream. Media permissions are requested only when video is toggled ON.
      this.localStream = new MediaStream();
      this.wasVideoEnabled = false;

      // Setup track ended handlers (will be empty initially)
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
    // Tracks are added dynamically in toggleVideo/ScreenShare, so we don't need to check here initially.
  }

  private setupVisibilityHandler() {
    this.visibilityChangeHandler = async () => {
      if (!document.hidden) {
        console.log('Tab returned to foreground - connection maintained');
      }
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

  private async handleUserJoined(data: any) {
    console.log('User joined:', data.userId);

    if (data.userId === this.userId) {
      return;
    }

    if (this.peers.has(data.userId)) {
      return;
    }

    const peer: Peer = {
      id: data.userId,
      displayName: data.displayName || 'Anonymous'
    };

    this.peers.set(data.userId, peer);
    this.iceCandidateBuffers.set(data.userId, []);
    
    try {
      await this.createPeerConnection(data.userId);
      await this.createOffer(data.userId);
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
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
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
        } else {
          // Add track to existing stream
          peer.stream.addTrack(event.track);
        }
        this.notifyPeersUpdate();
      }
    };

    // Monitor connection state
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
    
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, {
        id: peerId,
        displayName: data.displayName || 'Anonymous'
      });
      this.iceCandidateBuffers.set(peerId, []);
    }

    await this.createPeerConnection(peerId);

    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) {
      return;
    }

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
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
    if (!peer?.peerConnection) {
      return;
    }

    try {
      await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      
      // Process buffered ICE candidates
      const bufferedCandidates = this.iceCandidateBuffers.get(peerId) || [];
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
    
    const peer = this.peers.get(peerId);
    if (!peer?.peerConnection) {
      return;
    }

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
    
    let videoTrack = this.localStream.getVideoTracks()[0];
    let audioTrack = this.localStream.getAudioTracks()[0];
    
    // 1. Turn OFF
    if (videoTrack?.enabled || videoTrack?.readyState === 'live') {
      
      // Stop and remove video track
      videoTrack.stop(); 
      this.localStream.removeTrack(videoTrack);
      
      // Stop and remove associated audio track (CRITICAL for turning off mic light)
      if (audioTrack) {
        audioTrack.stop();
        this.localStream.removeTrack(audioTrack);
      }
      
      this.wasVideoEnabled = false;
      this.wasScreenSharing = false;
      
      // Update peer connections: replace tracks with null
      this.peers.forEach(peer => {
        const videoSender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(null);
        }
        const audioSender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'audio');
        if (audioSender) {
            audioSender.replaceTrack(null);
        }
      });
      
      return false;
    } else {
      // 2. Turn ON: Request media and add track
      try {
        // Request camera and microphone permissions
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true 
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        // Handle audio track: mute it and add it
        if (newAudioTrack) {
          newAudioTrack.enabled = false; // Mute audio to prevent echo
          const existingAudioTrack = this.localStream.getAudioTracks()[0];
          if (existingAudioTrack) {
            existingAudioTrack.stop();
            this.localStream.removeTrack(existingAudioTrack);
          }
          this.localStream.addTrack(newAudioTrack);
        }
        
        if (!newVideoTrack) {
          console.error('Failed to get video track.');
          return false;
        }
        
        this.localStream.addTrack(newVideoTrack);
        this.wasVideoEnabled = true;
        this.wasScreenSharing = false;
        
        // Setup ended handler for new track
        newVideoTrack.onended = async () => {
          console.warn('Video track ended unexpectedly');
          
          // Stop and remove associated audio track too
          const currentAudioTrack = this.localStream?.getAudioTracks()[0];
          if (currentAudioTrack) {
              currentAudioTrack.stop();
              this.localStream?.removeTrack(currentAudioTrack);
          }
          this.localStream?.removeTrack(newVideoTrack);
          
          this.peers.forEach(peer => {
            const videoSender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(null);
            }
            const audioSender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'audio');
            if (audioSender) {
                audioSender.replaceTrack(null);
            }
          });
          this.wasVideoEnabled = false;
          this.notifyPeersUpdate();
        };
        
        // Update peer connections - add or replace track
        this.peers.forEach(peer => {
          if (!peer.peerConnection) return;
          
          const videoSender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          
          if (videoSender) {
            videoSender.replaceTrack(newVideoTrack);
          } else {
            // If no sender exists yet, add the track and mark for renegotiation
            peer.peerConnection!.addTrack(newVideoTrack, this.localStream!);
            this.renegotiate(peer.id);
          }
          
          // Handle audio track replacement/addition
          const audioSender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'audio');
          if (newAudioTrack) {
             if (audioSender) {
                audioSender.replaceTrack(newAudioTrack);
             } else {
                peer.peerConnection!.addTrack(newAudioTrack, this.localStream!);
                this.renegotiate(peer.id);
             }
          }
        });
        
        return true;
      } catch (error) {
        console.error('Error starting video/getting media:', error);
        return false;
      }
    }
  }

  async toggleAudio() {
    // Audio feature removed
    return false;
  }

  async toggleScreenShare() {
    if (!this.localStream) return false;

    const currentVideoTrack = this.localStream.getVideoTracks()[0];
    const isCurrentlySharingScreen = currentVideoTrack && (currentVideoTrack as any).getSettings?.().displaySurface;
    
    // 1. Stop screen share
    if (isCurrentlySharingScreen) {
      currentVideoTrack.stop();
      this.localStream.removeTrack(currentVideoTrack);
      this.wasScreenSharing = false;
      
      // Only restore camera if it was enabled before screen sharing
      if (this.wasVideoEnabledBeforeScreenShare) {
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 }
          });
          
          const newVideoTrack = cameraStream.getVideoTracks()[0];
          this.localStream.addTrack(newVideoTrack);
          
          // Update peer connections
          this.peers.forEach(peer => {
            const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          });
          this.wasVideoEnabled = true;
        } catch (error) {
          console.error('Error returning to camera:', error);
          this.wasVideoEnabled = false;
        }
      } else {
        // Update peer connections to remove video
        this.peers.forEach(peer => {
          const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(null);
          }
        });
        
        // If we are not restoring the camera, we must stop the audio track too.
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.stop();
            this.localStream.removeTrack(audioTrack);
        }
        this.wasVideoEnabled = false;
      }
      
      return false; // Not sharing anymore
    } else {
      // 2. Start screen share - remember current video state
      this.wasVideoEnabledBeforeScreenShare = currentVideoTrack?.enabled || false;
      
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Stop current video track
        if (currentVideoTrack) {
          currentVideoTrack.stop();
          this.localStream.removeTrack(currentVideoTrack);
        }
        
        this.localStream.addTrack(screenTrack);
        this.wasScreenSharing = true;
        this.wasVideoEnabled = true; // Screen share counts as video enabled
        
        // Update peer connections
        this.peers.forEach(peer => {
          if (!peer.peerConnection) return;
          
          const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            peer.peerConnection.addTrack(screenTrack, this.localStream!);
            this.renegotiate(peer.id);
          }
        });

        // Handle when user stops sharing via browser UI
        screenTrack.onended = async () => {
          
          this.localStream?.removeTrack(screenTrack);
          this.wasScreenSharing = false;
          
          // Only restore camera if it was enabled before screen sharing
          if (this.wasVideoEnabledBeforeScreenShare) {
            try {
              const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
              });
              const newVideoTrack = cameraStream.getVideoTracks()[0];
              this.localStream?.addTrack(newVideoTrack);
              
              this.peers.forEach(peer => {
                const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                  sender.replaceTrack(newVideoTrack);
                }
              });
              this.wasVideoEnabled = true;
            } catch (e) {
              console.error('Error returning to camera after screen share ended:', e);
              this.wasVideoEnabled = false;
            }
          } else {
            // Remove video track from peer connections
            this.peers.forEach(peer => {
              const sender = peer.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(null);
              }
            });
            
            // Stop audio track if camera wasn't enabled before
            const audioTrack = this.localStream?.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.stop();
                this.localStream?.removeTrack(audioTrack);
            }
            this.wasVideoEnabled = false;
          }
          this.notifyPeersUpdate();
        };
        
        return true; // Now sharing
      } catch (error) {
        console.error('Error starting screen share:', error);
        return false;
      }
    }
  }

  disconnect() {
    // Remove visibility handler
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    // Close all peer connections
    this.peers.forEach(peer => {
      peer.peerConnection?.close();
    });

    // Stop local stream tracks (CRITICAL for turning off camera/mic light on exit)
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Leave signaling channel
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.peers.clear();
  }
}