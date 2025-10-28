import React, { useEffect, useRef } from 'react';
import { Peer } from '@/lib/webrtcP2P';
import { User } from 'lucide-react';

interface VideoGridP2PProps {
  localStream: MediaStream | null;
  peers: Peer[];
  userId: string;
}

const VideoGridP2P = ({ localStream, peers, userId }: VideoGridP2PProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const allParticipants = [
    { id: userId, stream: localStream, isLocal: true },
    ...peers.map(p => ({ id: p.id, stream: p.stream, isLocal: false }))
  ].filter(p => p.stream); // Only show participants with an active stream

  const setVideoElement = (
    el: HTMLVideoElement | null,
    participantId: string,
    isLocal: boolean,
    stream?: MediaStream | null
  ) => {
    if (!el) return;
    
    if (isLocal) {
      localVideoRef.current = el;
    } else {
      peerVideoRefs.current.set(participantId, el);
    }
    
    const mediaStream = stream;
    if (mediaStream) {
      try {
        if (el.srcObject !== mediaStream) el.srcObject = mediaStream;
        el.muted = isLocal;
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
  }, [peers]);

  const count = allParticipants.length;
  
  const getGridClasses = (c: number) => {
    if (c === 1) return 'grid-cols-1';
    if (c === 2) return 'grid-cols-2';
    if (c === 3 || c === 4) return 'grid-cols-2 lg:grid-cols-2';
    if (c > 4) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1';
  };

  return (
    <div className={`grid ${getGridClasses(count)} gap-4 h-full w-full`}>
      {allParticipants.map((participant) => (
        <div 
          key={participant.id} 
          className="relative bg-card rounded-xl overflow-hidden aspect-video shadow-card"
        >
          <video
            ref={(el) => setVideoElement(el, participant.id, participant.isLocal, participant.stream)}
            autoPlay
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror local video
          />
          <div className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-lg">
            <span className="text-foreground font-medium text-sm">
              {participant.isLocal ? 'You' : `Peer ${participant.id.substring(0, 4)}`}
            </span>
          </div>
          {/* Check if stream exists but has no enabled video tracks (e.g., camera off) */}
          {(!participant.stream || participant.stream.getVideoTracks().every(t => !t.enabled)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/90">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
      {/* Placeholder for empty slots if match size is fixed (e.g., 4) */}
      {Array(4 - count).fill(0).map((_, index) => (
        <div key={`placeholder-${index}`} className="relative bg-secondary rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-card">
          <User className="h-12 w-12 text-muted-foreground/50" />
          <span className="absolute bottom-4 text-muted-foreground text-sm">Waiting for peer...</span>
        </div>
      ))}
    </div>
  );
};

export default VideoGridP2P;