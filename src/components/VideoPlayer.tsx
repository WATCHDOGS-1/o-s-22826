import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Pin, Maximize, Minimize } from 'lucide-react';
import { Button } from './ui/button';

interface VideoPlayerProps {
  peerId: string;
  stream: MediaStream;
  isLocal: boolean;
  isPinned: boolean;
  onPinToggle: (peerId: string) => void;
  onMaximize: (peerId: string) => void;
  isMaximized: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  peerId,
  stream,
  isLocal,
  isPinned,
  onPinToggle,
  onMaximize,
  isMaximized,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const displayName = isLocal ? 'You (Local)' : `Peer ${peerId.substring(0, 4)}`;

  return (
    <div className={cn(
      "relative w-full h-full bg-black rounded-xl overflow-hidden shadow-xl transition-all duration-500",
      isPinned ? "border-4 border-primary/80 ring-4 ring-primary/50" : "border border-border/50"
    )}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover"
      />
      
      <div className="absolute top-0 left-0 p-2 bg-black/50 text-white text-xs rounded-br-lg">
        {displayName}
      </div>

      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {!isLocal && (
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onPinToggle(peerId)}
            className={cn("h-8 w-8", isPinned ? "bg-primary text-primary-foreground" : "bg-secondary/80")}
            title={isPinned ? "Unpin Video" : "Pin Video"}
          >
            <Pin className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onMaximize(peerId)}
          className="h-8 w-8 bg-secondary/80"
          title={isMaximized ? "Minimize" : "Maximize"}
        >
          {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default VideoPlayer;