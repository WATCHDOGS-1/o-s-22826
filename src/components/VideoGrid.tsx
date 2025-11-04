import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Video, VideoOff, Mic, MicOff, Monitor, Pin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoGridProps {
  userId: string;
}

interface Participant {
  id: string;
  username: string;
  stream?: MediaStream;
  pinned?: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ userId }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [maxVideos, setMaxVideos] = useState(4);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [username, setUsername] = useState('');
  const { toast } = useToast();
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadProfile();
    initializeMedia();
    setupPresenceChannel();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (data) setUsername(data.username);
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      
      // Add local video
      if (videoRefs.current['local']) {
        videoRefs.current['local']!.srcObject = stream;
      }

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

  const setupPresenceChannel = () => {
    const channel = supabase.channel('study-room');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setParticipants(users.map(u => ({ id: u.user_id, username: u.username })));
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        toast({
          title: "User Joined",
          description: `${newPresences[0].username} joined the room`,
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        toast({
          title: "User Left",
          description: `${leftPresences[0].username} left the room`,
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            username: username,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      
      // Replace video track
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = localStream?.getVideoTracks()[0];
      
      if (videoRefs.current['local']) {
        videoRefs.current['local']!.srcObject = screenStream;
      }

      setScreenSharing(true);
      
      videoTrack.onended = () => {
        setScreenSharing(false);
        if (localStream && videoRefs.current['local']) {
          videoRefs.current['local']!.srcObject = localStream;
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
    { id: 'local', username: 'You (Local)', stream: localStream, pinned: false },
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
              ref={(el) => (videoRefs.current[participant.id] = el)}
              autoPlay
              playsInline
              muted={participant.id === 'local'}
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