import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { showInfo, showError } from './toast';

export interface Signal {
  type: 'offer' | 'answer' | 'candidate' | 'join' | 'leave';
  senderId: string;
  recipientId?: string;
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit | string;
}

const CHANNEL_NAME = 'onlyfocus:global_room';
let channel: RealtimeChannel | null = null;

export function initializeSignaling(
  userId: string,
  onSignalReceived: (signal: Signal) => void,
  onUserJoined: (id: string) => void,
  onUserLeft: (id: string) => void
) {
  if (channel) {
    console.warn("Signaling already initialized.");
    return;
  }

  channel = supabase.channel(CHANNEL_NAME, {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  // 1. Handle incoming signals (offers, answers, candidates)
  channel.on('broadcast', { event: 'signal' }, (payload) => {
    const signal = payload.payload as Signal;
    onSignalReceived(signal);
  });

  // 2. Handle presence changes (users joining/leaving)
  channel.on('presence', { event: 'sync' }, () => {
    const presenceState = channel?.presenceState();
    const currentUsers = Object.keys(presenceState || {});
    
    // Identify new users
    currentUsers.forEach(id => {
      if (id !== userId) {
        onUserJoined(id);
      }
    });
  });

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    newPresences.forEach(p => {
      if (p.key !== userId) {
        onUserJoined(p.key);
        showInfo(`User ${p.key.substring(0, 4)} joined the room.`);
      }
    });
  });

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    leftPresences.forEach(p => {
      onUserLeft(p.key);
      showInfo(`User ${p.key.substring(0, 4)} left the room.`);
    });
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel?.track({ user_id: userId });
      showInfo("Connected to focus room signaling.");
    } else if (status === 'CHANNEL_ERROR') {
      showError("Signaling channel error.");
    }
  });
}

export function sendSignal(signal: Signal) {
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
  } else {
    console.error("Signaling channel not initialized.");
  }
}

export function getActiveUsers(): string[] {
  if (!channel) return [];
  const presenceState = channel.presenceState();
  return Object.keys(presenceState);
}

export function cleanupSignaling() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
    showInfo("Disconnected from focus room.");
  }
}