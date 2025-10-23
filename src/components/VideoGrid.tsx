import { useEffect, useRef, useState } from 'react';
import { Peer } from '@/lib/webrtc';
import { Pin, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  id: string;
  username: string;
  stream?: MediaStream | null;
  isLocal: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  peers: Peer[];
  localUserId: string;
  localUsername: string;
  roomId: string;
}

const VideoGrid = ({ localStream, peers, localUserId, localUsername, roomId }: VideoGridProps) => {
  const [pinnedPeers, setPinnedPeers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Setup Realtime listener for encouragement
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}_encouragement`);
    
    channel
      .on('broadcast', { event: 'encourage' }, ({ payload }: any) => {
        if (payload.toUserId === localUserId) {
          toast({
            title: 'Encouragement!',
            description: `${payload.fromUsername} sent you a boost! Keep focusing!`,
            duration: 3000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, localUserId, toast]);

  const setVideoElement = (
    el: HTMLVideoElement | null,
    participantId: string,
    isLocal: boolean,
    stream?: MediaStream | null
  ) => {
    if (!el) return;
    // Keep a ref for remote peers
    if (!isLocal) {
      peerVideoRefs.current.set(participantId, el);
    } else {
      localVideoRef.current = el;
    }
    // Assign the correct stream immediately to avoid gray frames on pin/unpin
    const mediaStream = isLocal ? localStream : stream;
    if (mediaStream) {
      try {
        if (el.srcObject !== mediaStream) el.srcObject = mediaStream;
        // Ensure playback starts
        el.onloadedmetadata = () => {
          el.play().catch(() => {});
        };
      } catch (e) {
        console.warn('Failed to attach stream', e);
      }
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    peers.forEach(peer => {
      const videoElement = peerVideoRefs.current.get(peer.id);
      if (videoElement && peer.stream) {
        videoElement.srcObject = peer.stream;
      }
    });
  }, [peers, pinnedPeers]);

  const allParticipants: Participant[] = [
    { id: localUserId, username: localUsername, stream: localStream, isLocal: true },
    ...peers.map(p => ({ ...p, username: p.displayName, isLocal: false }))
  ];

  const togglePin = (id: string) => {
    setPinnedPeers(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      } else {
        // Allow up to 4 pins (including local video if pinned)
        return [...prev, id].slice(-4);
      }
    });
    setCurrentPage(0); // Reset pagination when pins change
  };

  const sendEncouragement = async (toUserId: string, toUsername: string) => {
    await supabase.channel(`room:${roomId}_encouragement`).send({
      type: 'broadcast',
      event: 'encourage',
      payload: {
        toUserId,
        toUsername,
        fromUsername: localUsername,
      }
    });
    toast({
      title: 'Encouragement Sent!',
      description: `You sent a boost to ${toUsername}.`,
      duration: 2000,
    });
  };

  const pinnedParticipants = allParticipants.filter(p => pinnedPeers.includes(p.id));
  const unpinnedParticipants = allParticipants.filter(p => !pinnedPeers.includes(p.id));

  // Combine pinned and unpinned for display order
  const orderedParticipants = [...pinnedParticipants, ...unpinnedParticipants];
  
  // Determine the main grid layout based on the number of pinned videos
  const mainGridCount = pinnedParticipants.length > 0 ? pinnedParticipants.length : Math.min(4, orderedParticipants.length);
  
  const mainGridParticipants = pinnedParticipants.length > 0 
    ? pinnedParticipants 
    : orderedParticipants.slice(0, 4);

  const secondaryGridParticipants = pinnedParticipants.length > 0 
    ? unpinnedParticipants 
    : orderedParticipants.slice(4);

  // Pagination logic for secondary grid
  const itemsPerPage = isMobile ? 4 : 6;
  const totalPages = Math.ceil(secondaryGridParticipants.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleSecondaryParticipants = secondaryGridParticipants.slice(startIndex, endIndex);

  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    return 'grid-cols-3';
  };

  const renderVideoTile = (participant: Participant, isMain: boolean) => (
    <div 
      key={participant.id} 
      className={`relative bg-secondary rounded-md sm:rounded-lg overflow-hidden aspect-video min-h-0 ${isMain ? 'h-full' : 'h-auto'}`}
    >
      <video
        ref={(el) => setVideoElement(el, participant.id, participant.isLocal, participant.stream)}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 bg-background/90 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
        <span className="text-foreground font-medium truncate max-w-[100px] sm:max-w-none block">
          {participant.username} {participant.isLocal && '(You)'}
        </span>
      </div>
      
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-1">
        {/* Pin Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 sm:h-8 sm:w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm ${pinnedPeers.includes(participant.id) ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => togglePin(participant.id)}
          title={pinnedPeers.includes(participant.id) ? "Unpin" : "Pin"}
        >
          <Pin className={`h-3 w-3 sm:h-4 sm:w-4 ${pinnedPeers.includes(participant.id) ? 'fill-current' : ''}`} />
        </Button>
        
        {/* Encourage Button (Only for remote users) */}
        {!participant.isLocal && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 sm:h-8 sm:w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm text-yellow-400"
            onClick={() => sendEncouragement(participant.id, participant.username)}
            title="Send Encouragement"
          >
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col gap-2 sm:gap-4">
      {/* Main Grid (Pinned or First 4) */}
      <div className={`flex-1 grid ${getGridCols(mainGridParticipants.length)} gap-2 sm:gap-3 md:gap-4 ${secondaryGridParticipants.length > 0 ? 'min-h-[200px]' : 'h-full'}`}>
        {mainGridParticipants.map(p => renderVideoTile(p, true))}
      </div>

      {/* Secondary Grid (Unpinned/Remaining) */}
      {secondaryGridParticipants.length > 0 && (
        <div className="relative shrink-0">
          <div className={`grid ${getGridCols(visibleSecondaryParticipants.length)} gap-2 sm:gap-3 md:gap-4 h-28 sm:h-36 md:h-44`}>
            {visibleSecondaryParticipants.map(p => renderVideoTile(p, false))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoGrid;