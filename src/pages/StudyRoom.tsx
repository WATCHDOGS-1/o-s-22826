import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Video, VideoOff, Monitor } from 'lucide-react';
import { getUserId, getDisplayName } from '@/lib/userStorage';
import { WebRTCManager, Peer } from '@/lib/webrtc';
import { saveStudySession, ensureUser, getUserStats } from '@/lib/studyTracker';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import VideoGrid from '@/components/VideoGrid';
import StudyTimer from '@/components/StudyTimer';
import PomodoroTimer from '@/components/PomodoroTimer';
import ProgressStats from '@/components/ProgressStats';
import ChatRoom from '@/components/ChatRoom';

const StudyRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [sessionDuration, setSessionDuration] = useState(0);

  const webrtcManager = useRef<WebRTCManager | null>(null);
  const userId = getUserId();
  const displayName = getDisplayName() || 'Anonymous';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!roomId || !user) {
      return;
    }

    initializeRoom();
    loadUserStreak();

    // Timer to update session duration every second
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
    };
  }, [roomId, user]);

  const loadUserStreak = async () => {
    await ensureUser(userId, displayName);
    const stats = await getUserStats(userId);
    if (stats) {
      setCurrentStreak(stats.current_streak);
    }
  };

  const initializeRoom = async () => {
    try {
      setIsConnecting(true);

      // Ensure user exists in database
      await ensureUser(userId, displayName);

      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager(
        roomId!,
        userId,
        displayName,
        (updatedPeers) => {
          setPeers(updatedPeers);
        }
      );

      const stream = await webrtcManager.current.init();
      setLocalStream(stream);

      // Check if video track exists
      const hasVideo = stream.getVideoTracks().length > 0;
      setVideoEnabled(hasVideo);

      toast({
        title: 'Connected',
        description: `You joined room ${roomId}`,
      });

      setIsConnecting(false);
    } catch (error) {
      console.error('Error initializing room:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to study room',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const handleLeaveRoom = async () => {
    // Calculate session duration
    const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);

    // Save session if more than 1 minute
    if (sessionDuration >= 1) {
      await saveStudySession(userId, roomId!, sessionDuration);

      toast({
        title: 'Session Saved',
        description: `Studied for ${sessionDuration} minutes`,
      });
    }

    if (webrtcManager.current) {
      webrtcManager.current.disconnect();
    }

    navigate('/');
  };

  const handleSignOut = async () => {
    await handleLeaveRoom();
    await supabase.auth.signOut();
  };

  const toggleVideo = async () => {
    if (webrtcManager.current) {
      const enabled = await webrtcManager.current.toggleVideo();
      setVideoEnabled(enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (webrtcManager.current) {
      const sharing = await webrtcManager.current.toggleScreenShare();
      setIsScreenSharing(sharing);
    }
  };

  if (!user || isConnecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-primary text-xl mb-4">Connecting to room...</div>
          <p className="text-muted-foreground">Room: {roomId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground truncate max-w-[100px] sm:max-w-none">Study Room</h1>
              <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground hidden xs:inline truncate">#{roomId}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation" 
                onClick={toggleVideo}
                title={videoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {videoEnabled ? <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> : <VideoOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />}
              </Button>
              <Button 
                variant={isScreenSharing ? "default" : "ghost"} 
                size="icon" 
                className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 touch-manipulation" 
                onClick={toggleScreenShare}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Button>
              <ChatRoom roomId={roomId!} userId={userId} displayName={displayName} />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut} 
                className="ml-1 sm:ml-2 h-7 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4 touch-manipulation"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 sm:mr-1 md:mr-2" />
                <span className="hidden sm:inline text-xs md:text-sm">Sign Out</span>
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleLeaveRoom} 
                className="h-7 sm:h-9 md:h-10 px-2 sm:px-3 md:px-4 touch-manipulation"
              >
                <span className="text-xs md:text-sm">Leave</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-2 sm:px-4 py-2 sm:py-4 lg:py-6 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
        <div className="flex-1 min-h-[250px] sm:min-h-[350px] md:min-h-[450px] lg:min-h-[600px] overflow-hidden">
          <VideoGrid 
            localStream={localStream}
            peers={peers}
            localUserId={userId}
            localDisplayName={displayName}
          />
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <StudyTimer isActive={true} currentStreak={currentStreak} sessionDuration={sessionDuration} />
          <PomodoroTimer />
          <ProgressStats userId={user.id} autoRefresh={true} />
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;
