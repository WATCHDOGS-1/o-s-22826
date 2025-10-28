import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Users, Loader2, XCircle } from 'lucide-react';
import { WebRTCManager, Peer } from '@/lib/webrtcP2P';
import { SignalingClient, SignalingMessage } from '@/lib/signaling';
import { updateStatsAfterSession } from '@/lib/localStore';
import VideoGridP2P from '@/components/VideoGridP2P';
import FocusTimer, { FocusTimerRef } from '@/components/FocusTimer';
import LocalStats from '@/components/LocalStats';
import { toast } from 'sonner';

interface FocusSessionProps {
  matchSize: number;
  onEndSession: () => void;
}

const generateUserId = (): string => {
  return `user_${Math.random().toString(36).substring(2, 10)}`;
};

const FocusSession = ({ matchSize, onEndSession }: FocusSessionProps) => {
  const userId = useRef(generateUserId()).current;
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'active' | 'error'>('connecting');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const timerRef = useRef<FocusTimerRef>(null); 

  // --- Signaling and WebRTC Initialization ---

  const handleTimerMessage = useCallback((message: any) => {
    if (message.type === "TIMER_UPDATE") {
      // Relay remote timer update to the FocusTimer component
      if (timerRef.current && !isHost) {
        timerRef.current.handleRemoteTimerUpdate(message.remaining);
      }
    }
  }, [isHost]);

  const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
    if (msg.type === 'room-found' && msg.roomId && msg.peers) {
      
      // Determine host status (first peer in the list is the host)
      const hostId = msg.peers[0];
      const isCurrentHost = hostId === userId;
      setIsHost(isCurrentHost);
      
      // Initialize WebRTC Manager
      webrtcManagerRef.current = new WebRTCManager(
        userId,
        setPeers,
        handleTimerMessage,
        signalingClientRef.current!,
        isCurrentHost
      );
      
      // Start local stream (already initialized in setup)
      const stream = await webrtcManagerRef.current.initLocalStream();
      setLocalStream(stream);
      
      // Start P2P connections with all other peers
      for (const peerId of msg.peers) {
        if (peerId !== userId) {
          // Host initiates connection (offer) to everyone else
          // Clients wait for offers from the host
          const isInitiator = isCurrentHost; 
          await webrtcManagerRef.current.startPeerConnection(peerId, isInitiator);
        }
      }
      
      // Enable video by default
      webrtcManagerRef.current.toggleVideo(true);
      setVideoEnabled(true);
      
      setStatus('active');
      setRoomId(msg.roomId);
      
      toast.success("Match Found!", {
        description: `Room ${msg.roomId}. You are ${isCurrentHost ? 'the Host' : 'a Client'}.`,
      });

    } else if (msg.type === 'error') {
      setStatus('error');
      toast.error("Connection Error", { description: msg.error });
    } else {
      // Other messages (offer, answer, ice-candidate) are handled internally by WebRTCManager
    }
  }, [userId, handleTimerMessage]);

  const setupConnection = useCallback(() => {
    setStatus('connecting');
    
    // 1. Initialize Signaling Client
    signalingClientRef.current = new SignalingClient(
      userId,
      handleSignalingMessage,
      () => setStatus('waiting'),
      () => {
        if (status !== 'active') setStatus('error');
      }
    );
    
    signalingClientRef.current.connect(matchSize);
    
  }, [userId, matchSize, handleSignalingMessage, status]);

  useEffect(() => {
    setupConnection();
    
    return () => {
      webrtcManagerRef.current?.disconnect();
      signalingClientRef.current?.disconnect();
    };
  }, [setupConnection]);

  // --- Session Controls ---

  const handleToggleVideo = async () => {
    const newEnabled = !videoEnabled;
    const enabled = await webrtcManagerRef.current?.toggleVideo(newEnabled);
    setVideoEnabled(enabled ?? false);
  };
  
  const handleSessionComplete = (minutes: number) => {
    updateStatsAfterSession(minutes);
    setStatsRefreshKey(prev => prev + 1);
  };

  const handleLeave = () => {
    webrtcManagerRef.current?.disconnect();
    onEndSession();
  };

  // --- UI Rendering ---

  if (status === 'connecting' || status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {status === 'connecting' ? 'Connecting to Signaling Server...' : 'Finding Focus Partners...'}
        </h1>
        <p className="text-muted-foreground">
          Looking for {matchSize > 1 ? `${matchSize - 1} peer(s)` : 'a solo session'}.
        </p>
        <Button variant="outline" className="mt-8" onClick={handleLeave}>
          Cancel Search
        </Button>
        <p className="text-xs text-red-500 mt-4 text-center">
          Note: If stuck on 'Connecting', ensure the signaling server is running at {signalingClientRef.current?.ws?.url || 'ws://localhost:8081/signal'}
        </p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Connection Failed</h1>
        <p className="text-muted-foreground text-center mb-4">
          Could not establish connection. Please check the console for details or ensure the signaling server is running.
        </p>
        <Button onClick={setupConnection} className="mr-2">
          Try Again
        </Button>
        <Button variant="outline" onClick={handleLeave}>
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8">
      {/* Header/Controls */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
        <h1 className="text-3xl font-bold text-primary">
          OnlyFocus <span className="text-muted-foreground text-lg">#{roomId?.substring(0, 4)}</span>
        </h1>
        <div className="flex gap-3 items-center">
          <Button 
            variant={videoEnabled ? "default" : "outline"} 
            size="icon" 
            onClick={handleToggleVideo}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button variant="destructive" onClick={handleLeave}>
            <Users className="h-4 w-4 mr-2" /> Find New Partners
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Video Grid */}
        <div className="min-h-[400px] lg:min-h-full">
          <VideoGridP2P 
            localStream={localStream}
            peers={peers}
            userId={userId}
          />
        </div>

        {/* Sidebar: Timer & Stats */}
        <div className="space-y-6">
          <FocusTimer 
            manager={webrtcManagerRef.current} 
            isHost={isHost} 
            onSessionComplete={handleSessionComplete}
            ref={timerRef}
          />
          <LocalStats refreshKey={statsRefreshKey} />
        </div>
      </div>
    </div>
  );
};

export default FocusSession;