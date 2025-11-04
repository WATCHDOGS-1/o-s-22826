import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import { WebRTCMesh } from '@/lib/webrtcP2P';
import { initializeSignaling, cleanupSignaling, Signal, getActiveUsers } from '@/lib/signaling';
import VideoPlayer from '@/components/VideoPlayer';
import FocusRoomChat from '@/components/FocusRoomChat';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Video, VideoOff, Mic, MicOff, ScreenShare, StopCircle, MessageSquare } from 'lucide-react';
import { showEncouragement, showError, showInfo } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface StreamData {
  stream: MediaStream;
  isScreenShare: boolean;
}

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

const FocusRoom = () => {
  const { user, profile } = useUser();
  const userId = user?.id || 'anonymous';
  const userName = profile?.first_name || 'Focus User';

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, StreamData>>({});
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedPeers, setPinnedPeers] = useState<string[]>([]);
  const [maximizedPeer, setMaximizedPeer] = useState<string | null>(null);
  const [matchSize, setMatchSize] = useState(4);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const meshRef = useRef<WebRTCMesh | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // --- WebRTC Callbacks ---

  const handleRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    setRemoteStreams(prev => ({
      ...prev,
      [peerId]: { stream, isScreenShare: stream.getVideoTracks().some(t => t.label.includes('screen')) },
    }));
  }, []);

  const handlePeerDisconnected = useCallback((peerId: string) => {
    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[peerId];
      return newStreams;
    });
    setPinnedPeers(prev => prev.filter(id => id !== peerId));
    if (maximizedPeer === peerId) {
      setMaximizedPeer(null);
    }
  }, [maximizedPeer]);

  const handleDataChannelMessage = useCallback((senderId: string, data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'chat') {
        const newMessage: Message = {
          id: Date.now() + Math.random(),
          senderId,
          senderName: parsed.senderName || `Peer ${senderId.substring(0, 4)}`,
          content: parsed.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (parsed.type === 'pin_toggle') {
        setPinnedPeers(prev => {
          if (prev.includes(senderId)) {
            return prev.filter(id => id !== senderId);
          } else {
            return [...prev, senderId];
          }
        });
      }
    } catch (e) {
      console.error("Failed to parse incoming data channel message:", e);
    }
  }, []);

  // --- Signaling and Mesh Initialization ---

  useEffect(() => {
    if (!user) return;

    const handleSignal = (signal: Signal) => {
      if (signal.recipientId && signal.recipientId !== userId) return;
      meshRef.current?.handleSignal(signal);
    };

    const handleUserJoined = (peerId: string) => {
      meshRef.current?.handleNewPeer(peerId);
    };

    const handleUserLeft = (peerId: string) => {
      meshRef.current?.removePeer(peerId);
    };

    // 1. Initialize WebRTC Mesh
    meshRef.current = new WebRTCMesh(
      userId,
      handleRemoteStream,
      handlePeerDisconnected,
      handleDataChannelMessage
    );

    // 2. Initialize Supabase Signaling
    initializeSignaling(userId, handleSignal, handleUserJoined, handleUserLeft);

    // 3. Connect to existing users
    getActiveUsers().forEach(peerId => {
      if (peerId !== userId) {
        meshRef.current?.handleNewPeer(peerId);
      }
    });

    return () => {
      meshRef.current?.cleanup();
      cleanupSignaling();
    };
  }, [userId, handleRemoteStream, handlePeerDisconnected, handleDataChannelMessage, user]);

  // --- Media Controls ---

  const startLocalStream = useCallback(async (screenShare = false) => {
    try {
      let stream: MediaStream;
      if (screenShare) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenShareStreamRef.current = stream;
        setIsScreenSharing(true);
        showEncouragement("Screen sharing started!");
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setIsCameraOn(true);
        setIsMicOn(true);
        showEncouragement("Camera and Mic started!");
      }

      setLocalStream(stream);
      meshRef.current?.setLocalStream(stream);

      // Handle screen share stop event
      if (screenShare) {
        stream.getVideoTracks()[0].onended = () => stopLocalStream(true);
      }

    } catch (error) {
      showError(`Failed to access media: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Media access error:", error);
    }
  }, []);

  const stopLocalStream = useCallback((isScreen = false) => {
    const streamToStop = isScreen ? screenShareStreamRef.current : localStreamRef.current;
    
    if (streamToStop) {
      streamToStop.getTracks().forEach(track => track.stop());
    }

    if (isScreen) {
      screenShareStreamRef.current = null;
      setIsScreenSharing(false);
      showInfo("Screen sharing stopped.");
    } else {
      localStreamRef.current = null;
      setIsCameraOn(false);
      setIsMicOn(false);
      showInfo("Camera and Mic stopped.");
    }
    
    // If we stop the screen share, revert to camera stream if it was active
    if (isScreen && localStreamRef.current) {
        setLocalStream(localStreamRef.current);
        meshRef.current?.setLocalStream(localStreamRef.current);
    } else if (!isScreen && screenShareStreamRef.current) {
        // If we stop the camera, but screen share is active, keep screen share
        setLocalStream(screenShareStreamRef.current);
        meshRef.current?.setLocalStream(screenShareStreamRef.current);
    } else {
        // If both are off, set stream to null
        setLocalStream(null);
        meshRef.current?.setLocalStream(null);
    }

  }, []);

  const toggleCamera = () => {
    if (isCameraOn) {
      stopLocalStream(false);
    } else {
      startLocalStream(false);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
        showInfo(`Mic turned ${!isMicOn ? 'on' : 'off'}.`);
      }
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopLocalStream(true);
    } else {
      startLocalStream(true);
    }
  };

  // --- Pinning and Maximizing ---

  const togglePin = (peerId: string) => {
    setPinnedPeers(prev => {
      if (prev.includes(peerId)) {
        const newPins = prev.filter(id => id !== peerId);
        // Broadcast pin change
        meshRef.current?.broadcastData(JSON.stringify({ type: 'pin_toggle', peerId }));
        return newPins;
      } else {
        const newPins = [...prev, peerId];
        // Broadcast pin change
        meshRef.current?.broadcastData(JSON.stringify({ type: 'pin_toggle', peerId }));
        return newPins;
      }
    });
  };

  const toggleMaximize = (peerId: string) => {
    setMaximizedPeer(prev => (prev === peerId ? null : peerId));
  };

  // --- Chat Logic ---

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now() + Math.random(),
      senderId: userId,
      senderName: userName,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);

    // Broadcast chat message to all peers
    meshRef.current?.broadcastData(JSON.stringify({
      type: 'chat',
      senderName: userName,
      content,
    }));
  };

  // --- Rendering Logic ---

  const allStreams = {
    [userId]: { stream: localStream, isScreenShare: isScreenSharing },
    ...remoteStreams,
  };

  const streamKeys = Object.keys(allStreams).filter(id => allStreams[id].stream);

  // Prioritize pinned videos, then local video, then others
  const sortedStreamKeys = streamKeys.sort((a, b) => {
    const aPinned = pinnedPeers.includes(a);
    const bPinned = pinnedPeers.includes(b);
    const aLocal = a === userId;
    const bLocal = b === userId;

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (aLocal && !bLocal) return -1;
    if (!aLocal && bLocal) return 1;
    return 0;
  });

  const visibleStreamKeys = sortedStreamKeys.slice(0, matchSize);

  const gridLayoutClass = maximizedPeer
    ? "grid-cols-1 grid-rows-1"
    : cn({
        'grid-cols-1 grid-rows-1': visibleStreamKeys.length === 1,
        'grid-cols-2 grid-rows-1': visibleStreamKeys.length === 2,
        'grid-cols-2 grid-rows-2': visibleStreamKeys.length >= 3 && visibleStreamKeys.length <= 4,
        'grid-cols-3 grid-rows-2': visibleStreamKeys.length >= 5 && visibleStreamKeys.length <= 6,
        'grid-cols-3 grid-rows-3': visibleStreamKeys.length >= 7 && visibleStreamKeys.length <= 9,
        'grid-cols-4 grid-rows-3': visibleStreamKeys.length >= 10 && visibleStreamKeys.length <= 12,
        'grid-cols-4 grid-rows-4': visibleStreamKeys.length > 12,
      });

  const videoGrid = (
    <div className={cn(
      "w-full h-full grid gap-4 p-4 transition-all duration-700",
      gridLayoutClass
    )}>
      {visibleStreamKeys.map(peerId => {
        const data = allStreams[peerId];
        if (!data.stream) return null;

        const isMax = maximizedPeer === peerId;
        const isPinned = pinnedPeers.includes(peerId);

        return (
          <div
            key={peerId}
            className={cn(
              "relative transition-all duration-700",
              isMax ? "col-span-full row-span-full z-20" : "z-10"
            )}
            style={{ aspectRatio: '16/9' }}
          >
            <VideoPlayer
              peerId={peerId}
              stream={data.stream}
              isLocal={peerId === userId}
              isPinned={isPinned}
              onPinToggle={togglePin}
              onMaximize={toggleMaximize}
              isMaximized={isMax}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-4 p-4 bg-card rounded-xl shadow-lg border border-border/50 backdrop-blur-sm">
        <h1 className="text-3xl font-extrabold text-primary">Global Focus Room</h1>
        <div className="flex space-x-4">
          <Button onClick={() => setIsChatOpen(prev => !prev)} variant="outline" className="transition-transform duration-300 hover:scale-105">
            <MessageSquare className="mr-2 h-4 w-4" /> {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </Button>
          <Button onClick={() => window.history.back()} variant="secondary" className="transition-transform duration-300 hover:scale-105">
            <StopCircle className="mr-2 h-4 w-4" /> Leave Room
          </Button>
        </div>
      </header>

      <div className="flex-1 flex space-x-4 min-h-0">
        {/* Main Video Grid Area */}
        <div className={cn("flex-1 transition-all duration-500", isChatOpen ? "w-2/3" : "w-full")}>
          <div className="h-full flex flex-col space-y-4">
            {/* Video Grid */}
            <div className="flex-1 bg-muted/30 rounded-xl overflow-hidden relative min-h-[400px]">
              {streamKeys.length > 0 ? videoGrid : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xl">
                  No active streams. Start your camera or screen share!
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-card rounded-xl shadow-lg border border-border/50 flex justify-between items-center">
              <div className="flex space-x-4">
                <Button
                  onClick={toggleCamera}
                  variant={isCameraOn ? "default" : "destructive"}
                  size="icon"
                  title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={toggleMic}
                  variant={isMicOn ? "default" : "destructive"}
                  size="icon"
                  title={isMicOn ? "Turn Mic Off" : "Turn Mic On"}
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={toggleScreenShare}
                  variant={isScreenSharing ? "secondary" : "outline"}
                  size="default"
                  title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
                  className={cn(isScreenSharing && "bg-green-500 hover:bg-green-600 text-white")}
                >
                  <ScreenShare className="mr-2 h-4 w-4" />
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
              </div>

              {/* Match Size Slider (Feature 3) */}
              <div className="w-48">
                <label className="text-sm text-muted-foreground block mb-1">Max Videos: {matchSize}</label>
                <Slider
                  defaultValue={[4]}
                  max={16}
                  step={1}
                  min={1}
                  onValueChange={(val) => setMatchSize(val[0])}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {isChatOpen && (
          <div className="w-1/3 min-w-[300px] transition-all duration-500">
            <FocusRoomChat
              userId={userId}
              userName={userName}
              onSendMessage={handleSendMessage}
              incomingMessages={messages}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusRoom;