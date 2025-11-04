import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Video, VideoOff, Mic, MicOff, Monitor, Pin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

interface Participant {
  id: string;
  username: string;
  stream?: MediaStream;
  pinned?: boolean;
}

const VideoGrid: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [maxVideos, setMaxVideos] = useState(4);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const { username } = useUser();
  const { toast } = useToast();
  
  // Refs for managing connections and video elements
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const channelRef = useRef<any>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  
  // Stable local ID for signaling and presence tracking
  const localUserId = useRef(Math.random().toString(36).substr(2, 9));

  // 1. Initialization and Cleanup
  useEffect(() => {
    if (username) {
      initializeMedia();
      setupPresenceChannel();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [username]);

  // 2. Effect to add tracks to existing PCs once localStream is ready
  useEffect(() => {
    if (localStream) {
      // Attach local stream to local video element
      if (videoRefs.current[localUserId.current]) {
        videoRefs.current[localUserId.current]!.srcObject = localStream;
      }

      // Add tracks to all existing peer connections
      peerConnections.current.forEach(pc => {
        localStream.getTracks().forEach(track => {
          // Check if track is already added to avoid duplicates
          const sender = pc.getSenders().find(s => s.track === track);
          if (!sender) {
            pc.addTrack(track, localStream);
          }
        });
      });
    }
  }, [localStream]);


  // --- WebRTC Signaling and Connection Management ---

  const sendSignal = (remoteId: string, signal: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          senderId: localUserId.current,
          receiverId: remoteId,
          signal: signal,
        },
      });
    }
  };

  const createPeerConnection = (remoteId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(remoteId, { type: 'ice', candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      
      // Attach stream to video element immediately
      if (videoRefs.current[remoteId]) {
        videoRefs.current[remoteId]!.srcObject = remoteStream;
      }

      // Update state to ensure stream reference is maintained
      setParticipants(prev => prev.map(p => 
        p.id === remoteId ? { ...p, stream: remoteStream } : p
      ));
    };

    // Add tracks if localStream is already available (redundant due to useEffect, but safer)
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`Peer ${remoteId} disconnected.`);
        // Handle cleanup if necessary, though presence should cover this
      }
    };

    peerConnections.current.set(remoteId, pc);
    return pc;
  };
  
  const initiateCall = async (remoteId: string) => {
    const pc = createPeerConnection(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(remoteId, pc.localDescription);
  };

  const handleSignal = async (payload: any) => {
    const { senderId, receiverId, signal } = payload;
    
    if (receiverId !== localUserId.current) return;

    let pc = peerConnections.current.get(senderId);

    if (signal.type === 'offer') {
      if (!pc) {
        pc = createPeerConnection(senderId);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(senderId, pc.localDescription);
    } else if (signal.type === 'answer') {
      if (pc && pc.remoteDescription?.type !== 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      }
    } else if (signal.type === 'ice') {
      if (pc && signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    }
  };

  // --- Media Initialization ---

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      
      toast({
        title: "Camera Ready",
        description: "Your video is now live",
      });
    } catch (error) {
      console.error('Error accessing media:', error);
      toast({
        title: "Media Error",
        description: "Could not access camera/microphone",
        variant: "destructive",
      });
    }
  };

  // --- Presence Channel Setup ---

  const setupPresenceChannel = () => {
    const channel = supabase.channel('study-room');

    channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        handleSignal(payload.payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        
        const newParticipants = users
          .filter(u => u.id !== localUserId.current)
          .map(u => ({ 
            id: u.id, 
            username: u.username,
            // Preserve existing stream reference if available
            stream: participants.find(p => p.id === u.id)?.stream,
          }));
        
        setParticipants(newParticipants);
        
        // Initiate calls to new users
        newParticipants.forEach(p => {
            if (!peerConnections.current.has(p.id)) {
                // Simple tie-breaker: only initiate call if local ID is lexicographically smaller
                if (localUserId.current < p.id) {
                    initiateCall(p.id);
                }
            }
        });
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => {
            if (p.id === localUserId.current) return;
            toast({
              title: "User Joined",
              description: `${p.username} joined the room`,
            });
            // If we are the lexicographically smaller ID, we initiate the call immediately
            if (localUserId.current < p.id) {
                initiateCall(p.id);
            }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach(p => {
            toast({
              title: "User Left",
              description: `${p.username} left the room`,
            });
            // Clean up peer connection
            const pc = peerConnections.current.get(p.id);
            if (pc) {
                pc.close();
                peerConnections.current.delete(p.id);
            }
            setParticipants(prev => prev.filter(pt => pt.id !== p.id));
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: localUserId.current,
            username: username,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  // --- Controls ---

  const updateLocalTracks = (kind: 'video' | 'audio', enabled: boolean) => {
    if (localStream) {
      const tracks = kind === 'video' ? localStream.getVideoTracks() : localStream.getAudioTracks();
      tracks.forEach(track => (track.enabled = enabled));
      
      // Notify peers about track changes (though WebRTC handles this automatically, 
      // toggling the track.enabled property is sufficient for most browsers)
    }
  };

  const toggleVideo = () => {
    const newEnabled = !videoEnabled;
    updateLocalTracks('video', newEnabled);
    setVideoEnabled(newEnabled);
  };

  const toggleAudio = () => {
    const newEnabled = !audioEnabled;
    updateLocalTracks('audio', newEnabled);
    setAudioEnabled(newEnabled);
  };

  const startScreenShare = async () => {
    if (screenSharing) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      
      if (videoRefs.current[localUserId.current]) {
        videoRefs.current[localUserId.current]!.srcObject = screenStream;
      }
      
      // Replace tracks on all peer connections
      peerConnections.current.forEach(pc => {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
              sender.replaceTrack(videoTrack);
          } else {
              // Should not happen if camera stream was initialized
              pc.addTrack(videoTrack, screenStream);
          }
      });

      setScreenSharing(true);
      
      screenStream.getVideoTracks()[0].onended = () => {
        setScreenSharing(false);
        
        // Revert to camera stream
        if (localStream && videoRefs.current[localUserId.current]) {
          videoRefs.current[localUserId.current]!.srcObject = localStream;
          
          // Replace tracks back to camera stream
          peerConnections.current.forEach(pc => {
              const cameraTrack = localStream.getVideoTracks()[0];
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) {
                  sender.replaceTrack(cameraTrack);
              }
          });
        }
      };

      toast({
        title: "Screen Sharing",
        description: "Your screen is now being shared",
      });
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const togglePin = (participantId: string) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === participantId ? { ...p, pinned: !p.pinned } : p
      )
    );
  };

  const displayedParticipants = [
    { id: localUserId.current, username: `You (${username})`, stream: localStream, pinned: false },
    ...participants,
  ].slice(0, maxVideos);

  return (
    <div className="glass p-6 rounded-2xl glow animate-slide-up">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-glow">Study Room</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Max Videos:</span>
          <Slider
            value={[maxVideos]}
            onValueChange={(v) => setMaxVideos(v[0])}
            min={1}
            max={9}
            step={1}
            className="w-32"
          />
          <span className="text-sm font-bold text-primary">{maxVideos}</span>
        </div>
      </div>

      <div className={`grid gap-4 mb-4 ${
        maxVideos <= 2 ? 'grid-cols-1 md:grid-cols-2' :
        maxVideos <= 4 ? 'grid-cols-2 md:grid-cols-2' :
        maxVideos <= 6 ? 'grid-cols-2 md:grid-cols-3' :
        'grid-cols-3 md:grid-cols-3'
      }`}>
        {displayedParticipants.map((participant) => (
          <div
            key={participant.id}
            className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
              participant.pinned ? 'border-accent glow-strong' : 'border-primary/30'
            }`}
          >
            <video
              ref={(el) => {
                videoRefs.current[participant.id] = el;
                // Attach stream if available (only needed for local stream initialization)
                if (el && participant.id === localUserId.current && participant.stream) {
                    el.srcObject = participant.stream;
                }
              }}
              autoPlay
              playsInline
              muted={participant.id === localUserId.current}
              className="w-full h-full object-cover bg-card"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{participant.username}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => togglePin(participant.id)}
                  className="h-6 w-6 p-0"
                >
                  <Pin className={`h-4 w-4 ${participant.pinned ? 'text-accent' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={toggleVideo}
          variant={videoEnabled ? 'default' : 'destructive'}
          className="glow"
        >
          {videoEnabled ? <Video /> : <VideoOff />}
        </Button>
        <Button
          onClick={toggleAudio}
          variant={audioEnabled ? 'default' : 'destructive'}
          className="glow"
        >
          {audioEnabled ? <Mic /> : <MicOff />}
        </Button>
        <Button
          onClick={startScreenShare}
          variant={screenSharing ? 'secondary' : 'outline'}
          className="glow"
        >
          <Monitor />
        </Button>
      </div>
    </div>
  );
};

export default VideoGrid;