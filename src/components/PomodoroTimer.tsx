import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PomodoroTimer = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: any = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            handleComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds]);

  const handleComplete = () => {
    setIsActive(false);
    
    if (!isBreak) {
      toast({
        title: "Pomodoro Complete! 🎉",
        description: "Time for a 5-minute break!",
      });
      setIsBreak(true);
      setMinutes(5);
      setSeconds(0);
    } else {
      toast({
        title: "Break Over! 💪",
        description: "Ready for another focus session?",
      });
      setIsBreak(false);
      setMinutes(25);
      setSeconds(0);
    }
  };

  const toggle = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const progress = isBreak
    ? ((5 * 60 - (minutes * 60 + seconds)) / (5 * 60)) * 100
    : ((25 * 60 - (minutes * 60 + seconds)) / (25 * 60)) * 100;

  return (
    <div className="glass p-6 rounded-2xl glow animate-slide-up">
      <h2 className="text-2xl font-bold mb-4 text-glow">Pomodoro Timer</h2>
      
      <div className="relative w-48 h-48 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke="hsl(var(--border))"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            stroke={isBreak ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
            className="transition-all duration-1000 glow"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-glow">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {isBreak ? 'Break Time' : 'Focus Time'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={toggle}
          variant={isActive ? 'destructive' : 'default'}
          className="glow"
        >
          {isActive ? <Pause /> : <Play />}
        </Button>
        <Button onClick={reset} variant="outline" className="glow">
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
};

export default PomodoroTimer;