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
  
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const channelRef = useRef<any>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
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

  // 2. Effect to initiate calls once localStream is ready and participants are known
  useEffect(() => {
    if (localStream && participants.length > 0) {
      participants.forEach(p => {
        if (!peerConnections.current.has(p.id)) {
          initiateCall(p.id);
        }
      });
    }
  }, [localStream, participants]);

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
      if (videoRefs.current[remoteId]) {
        videoRefs.current[remoteId]!.srcObject = remoteStream;
      }
      setParticipants(prev => prev.map(p => 
        p.id === remoteId ? { ...p, stream: remoteStream } : p
      ));
    };

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));
    }

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
    if (!pc) {
      pc = createPeerConnection(senderId);
    }

    if (signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(senderId, pc.localDescription);
    } else if (signal.type === 'answer') {
      if (pc.remoteDescription?.type !== 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      }
    } else if (signal.type === 'ice' && signal.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    }
  };

  // --- Media Initialization ---

  const initializeMedia = async () => {
    try {
      console.log('Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('Media stream obtained:', stream.getTracks());
      setLocalStream(stream);
      
      // Wait for video ref to be available
      setTimeout(() => {
        if (videoRefs.current[localUserId.current]) {
          videoRefs.current[localUserId.current]!.srcObject = stream;
          videoRefs.current[localUserId.current]!.play().catch(e => console.error('Error playing video:', e));
        }
      }, 100);
      
      toast({ title: "Camera Ready", description: "Your video is now live" });
    } catch (error: any) {
      console.error('Error accessing media:', error);
      let description = "Could not access camera/microphone. Check device connections.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        description = "Permission to access camera/microphone was denied. Please allow access in your browser's settings and refresh the page.";
      } else if (error.name === 'NotFoundError') {
        description = "No camera or microphone found. Please ensure your devices are connected.";
      }
      toast({ title: "Media Access Error", description, variant: "destructive" });
    }
  };

  // --- Presence Channel Setup ---

  const setupPresenceChannel = () => {
    const channel = supabase.channel('study-room');
    channel
      .on('broadcast', { event: 'signal' }, (payload) => handleSignal(payload.payload))
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setParticipants(users.filter(u => u.id !== localUserId.current).map(u => ({ id: u.id, username: u.username })));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const newUser = newPresences[0];
        if (newUser && newUser.id !== localUserId.current) {
          toast({ title: "User Joined", description: `${newUser.username} joined the room` });
          setParticipants(prev => [...prev, { id: newUser.id, username: newUser.username }]);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const leftUser = leftPresences[0];
        if (leftUser) {
          toast({ title: "User Left", description: `${leftUser.username} left the room` });
          const pc = peerConnections.current.get(leftUser.id);
          if (pc) {
            pc.close();
            peerConnections.current.delete(leftUser.id);
          }
          setParticipants(prev => prev.filter(p => p.id !== leftUser.id));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: localUserId.current, username, online_at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;
  };

  // --- Controls ---

  const updateLocalTracks = (kind: 'video' | 'audio', enabled: boolean) => {
    localStream?.getTracks().filter(t => t.kind === kind).forEach(t => t.enabled = enabled);
  };

  const toggleVideo = () => { setVideoEnabled(v => { updateLocalTracks('video', !v); return !v; }); };
  const toggleAudio = () => { setAudioEnabled(a => { updateLocalTracks('audio', !a); return !a; }); };

  const startScreenShare = async () => {
    if (screenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      
      if (videoRefs.current[localUserId.current]) {
        videoRefs.current[localUserId.current]!.srcObject = screenStream;
      }
      
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        sender?.replaceTrack(screenTrack);
      });

      setScreenSharing(true);
      screenTrack.onended = () => {
        setScreenSharing(false);
        const cameraTrack = localStream?.getVideoTracks()[0];
        if (cameraTrack) {
          if (videoRefs.current[localUserId.current]) {
            videoRefs.current[localUserId.current]!.srcObject = localStream;
          }
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            sender?.replaceTrack(cameraTrack);
          });
        }
      };
      toast({ title: "Screen Sharing", description: "Your screen is now being shared" });
    } catch (error) { console.error('Error sharing screen:', error); }
  };

  const togglePin = (participantId: string) => {
    setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, pinned: !p.pinned } : p));
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
          <Slider value={[maxVideos]} onValueChange={(v) => setMaxVideos(v[0])} min={1} max={9} step={1} className="w-32" />
          <span className="text-sm font-bold text-primary">{maxVideos}</span>
        </div>
      </div>

      <div className={`grid gap-4 mb-4 ${ maxVideos <= 2 ? 'grid-cols-1 md:grid-cols-2' : maxVideos <= 4 ? 'grid-cols-2' : maxVideos <= 6 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-3' }`}>
        {displayedParticipants.map((p) => (
          <div key={p.id} className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${ p.pinned ? 'border-accent glow-strong' : 'border-primary/30' }`}>
            <video ref={el => { videoRefs.current[p.id] = el; if (el && p.stream) el.srcObject = p.stream; }} autoPlay playsInline muted={p.id === localUserId.current} className="w-full h-full object-cover bg-card" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{p.username}</span>
                <Button size="sm" variant="ghost" onClick={() => togglePin(p.id)} className="h-6 w-6 p-0">
                  <Pin className={`h-4 w-4 ${p.pinned ? 'text-accent' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={toggleVideo} variant={videoEnabled ? 'default' : 'destructive'} className="glow">
          {videoEnabled ? <Video /> : <VideoOff />}
        </Button>
        <Button onClick={toggleAudio} variant={audioEnabled ? 'default' : 'destructive'} className="glow">
          {audioEnabled ? <Mic /> : <MicOff />}
        </Button>
        <Button onClick={startScreenShare} variant={screenSharing ? 'secondary' : 'outline'} className="glow">
          <Monitor />
        </Button>
      </div>
    </div>
  );
};

export default VideoGrid;