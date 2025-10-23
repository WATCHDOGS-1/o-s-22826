import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Video, VideoOff } from 'lucide-react';
import { getUserId } from '@/lib/userStorage';
import { WebRTCManager, Peer } from '@/lib/webrtc';
import { saveStudySession, ensureUser, getUserStats, getDisplayUsername } from '@/lib/studyTracker';
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
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [todaysTotalMinutes, setTodaysTotalMinutes] = useState(0);
  const [sessionStartTimestamp, setSessionStartTimestamp] = useState<number>(Date.now());
  const [username, setUsernameState] = useState('Anonymous');

  const webrtcManager = useRef<WebRTCManager | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0);
  const userId = getUserId();

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

    loadTimerState();
    
    const fullInitialization = async () => {
        const name = await getDisplayUsername(userId);
        setUsernameState(name);
        
        await loadUserStreak();
        await initializeRoom(name);
    };
    
    fullInitialization();

    return () => {
      saveTimerState();
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
    };
  }, [roomId, user]);

  // Timer effect - runs continuously and calculates elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        const now = Date.now();
        // Calculate elapsed time since session start, minus total accumulated pause time
        const elapsed = Math.floor((now - sessionStartTimestamp - totalPausedTimeRef.current) / 1000);
        setSessionDuration(Math.max(0, elapsed));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, sessionStartTimestamp]);

  // Auto-save and state persistence
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      saveTimerState();
      const sessionMinutes = Math.floor(sessionDuration / 60);
      const totalMinutes = todaysTotalMinutes + sessionMinutes;
      if (totalMinutes > 0) {
        await saveStudySession(userId, roomId!, totalMinutes);
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(saveInterval);
  }, [sessionDuration, todaysTotalMinutes, userId, roomId]);

  const loadTimerState = () => {
    const storageKey = `study_timer_${userId}_${roomId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const state = JSON.parse(saved);
        // Only load pause state and paused time from local storage
        setIsPaused(state.isPaused);
        totalPausedTimeRef.current = state.totalPausedTime || 0;
        
        if (state.isPaused && state.pauseStartTime) {
          pauseStartTimeRef.current = state.pauseStartTime;
        }
      } catch (e) {
        console.error('Error loading timer state:', e);
      }
    }
  };

  const saveTimerState = () => {
    const storageKey = `study_timer_${userId}_${roomId}`;
    const state = {
      isPaused,
      totalPausedTime: totalPausedTimeRef.current,
      pauseStartTime: pauseStartTimeRef.current,
      lastSaved: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const loadUserStreak = async () => {
    await ensureUser(userId); // Ensure user exists
    const stats = await getUserStats(userId);
    if (stats) {
      setCurrentStreak(stats.current_streak);
    }
    
    // Load today's existing study time and session start from DB
    const { data: user } = await (supabase as any)
      .from('users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySession } = await (supabase as any)
        .from('study_sessions')
        .select('minutes_studied, session_start')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      const totalPausedTime = totalPausedTimeRef.current; // Use locally loaded pause time

      if (todaySession) {
        setTodaysTotalMinutes(todaySession.minutes_studied);
        
        if (todaySession.session_start) {
          const sessionStartTime = new Date(todaySession.session_start).getTime();
          setSessionStartTimestamp(sessionStartTime); 
          
          const now = Date.now();
          // Calculate elapsed time since DB session start, minus accumulated pause time
          const elapsedSeconds = Math.floor((now - sessionStartTime - totalPausedTime) / 1000);
          setSessionDuration(Math.max(0, elapsedSeconds));
        } else {
          // Should not happen if session is created correctly, but handle it by setting new start time
          const newSessionStart = new Date().toISOString();
          const newSessionStartTimestamp = new Date(newSessionStart).getTime();
          setSessionStartTimestamp(newSessionStartTimestamp);
          setSessionDuration(0);
          
          await (supabase as any)
            .from('study_sessions')
            .update({ session_start: newSessionStart })
            .eq('user_id', user.id)
            .eq('date', today);
        }
      } else {
        // No session today, start fresh
        setTodaysTotalMinutes(0);
        setSessionDuration(0);
        
        const newSessionStart = new Date().toISOString();
        const newSessionStartTimestamp = new Date(newSessionStart).getTime();
        setSessionStartTimestamp(newSessionStartTimestamp);
        
        await (supabase as any)
          .from('study_sessions')
          .insert({
            user_id: user.id,
            room_id: roomId,
            date: today,
            minutes_studied: 0,
            session_start: newSessionStart
          });
      }
    }
  };

  const initializeRoom = async (currentUsername: string) => {
    try {
      setIsConnecting(true);

      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager(
        roomId!,
        userId,
        currentUsername, // Use username as display name
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
      navigate('/home');
    }
  };

  const handleLeaveRoom = async () => {
    // Save timer state before leaving
    saveTimerState();
    
    // Calculate total study time for today
    const sessionMinutes = Math.floor(sessionDuration / 60);
    const totalMinutes = todaysTotalMinutes + sessionMinutes;

    // Save session if there was any study time in this session
    if (totalMinutes > 0) {
      await saveStudySession(userId, roomId!, totalMinutes);

      toast({
        title: 'Session Saved',
        description: `Total studied today: ${totalMinutes} minutes`,
      });
    }

    // Stop all media streams before disconnecting
    if (webrtcManager.current) {
      webrtcManager.current.disconnect();
    }

    // Clear timer state from localStorage after leaving
    const storageKey = `study_timer_${userId}_${roomId}`;
    localStorage.removeItem(storageKey);

    navigate('/home');
  };

  const handleSignOut = async () => {
    await handleLeaveRoom();
    await supabase.auth.signOut();
  };

  const toggleVideo = async () => {
    if (webrtcManager.current) {
      const newState = await webrtcManager.current.toggleVideo();
      setVideoEnabled(newState);
      // Crucial: Update localStream state to force VideoGrid re-render and update video element srcObject
      setLocalStream(webrtcManager.current.getLocalStream());
    }
  };

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // Starting pause
      pauseStartTimeRef.current = Date.now();
    } else {
      // Ending pause
      if (pauseStartTimeRef.current) {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        totalPausedTimeRef.current += pauseDuration;
        pauseStartTimeRef.current = null;
      }
    }
    
    saveTimerState();
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
              <ChatRoom roomId={roomId!} userId={userId} username={username} />
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
            localUsername={username}
            roomId={roomId!}
          />
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <StudyTimer 
            isActive={!isPaused} 
            currentStreak={currentStreak} 
            sessionDuration={sessionDuration}
            todaysTotalMinutes={todaysTotalMinutes}
            onPauseToggle={handlePauseToggle}
            isPaused={isPaused}
          />
          <PomodoroTimer />
          <ProgressStats userId={userId} autoRefresh={true} />
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;