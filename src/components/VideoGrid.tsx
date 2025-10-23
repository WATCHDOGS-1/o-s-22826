import { useEffect, useRef, useState } from 'react';
import { Peer } from '@/lib/webrtc';
import { Pin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoGridProps {
  localStream: MediaStream | null;
  peers: Peer[];
  localUserId: string;
  localDisplayName: string;
}

const VideoGrid = ({ localStream, peers, localUserId, localDisplayName }: VideoGridProps) => {
  const [pinnedPeer, setPinnedPeer] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const isMobile = useIsMobile();

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
  }, [peers, pinnedPeer]);

  const allParticipants = [
    { id: localUserId, displayName: localDisplayName, stream: localStream, isLocal: true },
    ...peers.map(p => ({ ...p, isLocal: false }))
  ];

  const pinnedParticipant = pinnedPeer ? allParticipants.find(p => p.id === pinnedPeer) : null;
  const gridParticipants = pinnedPeer 
    ? allParticipants.filter(p => p.id !== pinnedPeer) 
    : allParticipants;

  // Pagination logic
  const itemsPerPage = isMobile ? 4 : (pinnedPeer ? 3 : 6);
  const totalPages = Math.ceil(gridParticipants.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleParticipants = gridParticipants.slice(startIndex, endIndex);

  // Reset page if out of bounds
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const getGridCols = (count: number) => {
    if (isMobile) {
      return count === 1 ? 'grid-cols-1' : 'grid-cols-2';
    }
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 lg:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className="h-full w-full flex flex-col gap-2 sm:gap-4">
      {pinnedParticipant && (
        <div className="relative flex-1 bg-secondary rounded-lg sm:rounded-xl overflow-hidden">
          <video
            key={`pinned-${pinnedParticipant.id}`}
            ref={(el) => setVideoElement(el, pinnedParticipant.id, pinnedParticipant.isLocal, pinnedParticipant.stream)}
            autoPlay
            playsInline
            muted={pinnedParticipant.isLocal}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-background/80 backdrop-blur px-2 sm:px-4 py-1 sm:py-2 rounded-lg">
            <span className="text-foreground font-medium text-xs sm:text-sm">
              {pinnedParticipant.displayName} {pinnedParticipant.isLocal && '(You)'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 sm:top-4 right-2 sm:right-4 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => setPinnedPeer(null)}
          >
            <Pin className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
          </Button>
        </div>
      )}

      <div className="relative h-full">
        <div className={`grid ${getGridCols(visibleParticipants.length)} gap-2 sm:gap-3 md:gap-4 ${pinnedPeer ? 'h-28 sm:h-36 md:h-44' : 'h-full'}`}>
          {visibleParticipants.map((participant) => (
            <div key={participant.id} className="relative bg-secondary rounded-md sm:rounded-lg overflow-hidden aspect-video min-h-0">
              <video
                ref={(el) => setVideoElement(el, participant.id, participant.isLocal, participant.stream)}
                autoPlay
                playsInline
                muted={participant.isLocal}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 bg-background/90 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
                <span className="text-foreground font-medium truncate max-w-[100px] sm:max-w-none block">
                  {participant.displayName} {participant.isLocal && '(You)'}
                </span>
              </div>
              {!pinnedPeer && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 sm:top-2 right-1 sm:right-2 h-6 w-6 sm:h-8 sm:w-8 bg-background/50 hover:bg-background/80 backdrop-blur-sm"
                  onClick={() => setPinnedPeer(participant.id)}
                >
                  <Pin className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          ))}
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
    </div>
  );
};

export default VideoGrid;
