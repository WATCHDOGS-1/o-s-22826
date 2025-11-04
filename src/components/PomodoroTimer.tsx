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
    <div className="glass p-4 rounded-2xl glow animate-slide-up">
      <h2 className="text-xl font-bold mb-3 text-glow">Pomodoro</h2>
      
      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="72"
            stroke="hsl(var(--border))"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="80"
            cy="80"
            r="72"
            stroke={isBreak ? "hsl(var(--secondary))" : "hsl(var(--primary))"}
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 72}`}
            strokeDashoffset={`${2 * Math.PI * 72 * (1 - progress / 100)}`}
            className="transition-all duration-1000 glow"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-glow">
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isBreak ? 'Break' : 'Focus'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button
          onClick={toggle}
          variant={isActive ? 'destructive' : 'default'}
          className="glow"
          size="sm"
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button onClick={reset} variant="outline" className="glow" size="sm">
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );
};

export default PomodoroTimer;