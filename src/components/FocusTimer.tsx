import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import { WebRTCManager } from '@/lib/webrtcP2P';
import { updateStatsAfterSession } from '@/lib/localStore';
import { toast } from 'sonner';

interface FocusTimerProps {
  manager: WebRTCManager | null;
  isHost: boolean;
  onSessionComplete: (minutes: number) => void;
}

const FOCUS_TIME = 25 * 60; // 25 minutes
const BREAK_TIME = 5 * 60; // 5 minutes

export interface FocusTimerRef {
    handleRemoteTimerUpdate: (remoteTime: number) => void;
}

const FocusTimer = forwardRef<FocusTimerRef, FocusTimerProps>(({ manager, isHost, onSessionComplete }, ref) => {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Expose remote update handler to parent component
  useImperativeHandle(ref, () => ({
    handleRemoteTimerUpdate,
  }));

  // Host logic: controls the timer and broadcasts updates
  useEffect(() => {
    if (isHost && isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          
          // Broadcast update every 5 seconds or if time is low
          if (newTime % 5 === 0 || newTime < 10) {
            manager?.sendTimerUpdate(newTime);
          }
          
          if (newTime <= 0) {
            clearInterval(intervalRef.current!);
            handleTimerEnd();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isHost, manager]);

  // Non-Host logic: syncs timer state from host messages
  const handleRemoteTimerUpdate = (remoteTime: number) => {
    if (!isHost) {
      if (remoteTime === -1) {
        // Signal to pause/stop
        setIsActive(false);
      } else if (remoteTime > 0) {
        // Sync time and ensure active
        setTimeLeft(remoteTime);
        setIsActive(true);
      } else if (remoteTime === 0) {
        // Signal end
        handleTimerEnd();
      }
    }
  };

  const handleTimerEnd = () => {
    setIsActive(false);
    
    const minutes = isBreak ? 0 : Math.floor(FOCUS_TIME / 60);
    
    if (!isBreak) {
        onSessionComplete(minutes);
        
        toast.success("Focus Session Complete!", {
            description: `You studied for ${minutes} minutes. Time for a break!`,
            icon: <CheckCircle className="h-4 w-4" />
        });
    } else {
        toast.info("Break Time Over!", {
            description: "Time to start a new focus session.",
        });
    }

    const newIsBreak = !isBreak;
    setIsBreak(newIsBreak);
    setTimeLeft(newIsBreak ? BREAK_TIME : FOCUS_TIME);
  };

  const toggleTimer = () => {
    if (!isHost) {
        toast.warning("Only the host can control the timer.");
        return;
    }
    const newState = !isActive;
    setIsActive(newState);
    
    // Immediate broadcast of state change
    manager?.sendTimerUpdate(newState ? timeLeft : -1); 
  };
  
  const resetTimer = () => {
    if (!isHost) {
        toast.warning("Only the host can control the timer.");
        return;
    }
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(FOCUS_TIME);
    manager?.sendTimerUpdate(FOCUS_TIME);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 bg-card border-border shadow-glow/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Shared Pomodoro</h3>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${
          isBreak ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
        }`}>
          {isBreak ? 'Break' : 'Focus'}
        </span>
      </div>

      <div className="text-center mb-4">
        <div className="text-6xl font-extrabold text-primary mb-2">
          {formatTime(timeLeft)}
        </div>
        <p className="text-muted-foreground text-sm">
          {isBreak ? '5 min break' : '25 min focus session'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={toggleTimer} 
          className="flex-1"
          variant={isActive ? "outline" : "default"}
          disabled={!isHost}
        >
          {isActive ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start
            </>
          )}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="icon" disabled={!isHost}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        {isHost ? "You are the host and control the timer." : "Timer synced with host."}
      </p>
    </Card>
  );
});

export default FocusTimer;