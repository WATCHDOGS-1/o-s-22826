import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      const newIsBreak = !isBreak;
      setIsBreak(newIsBreak);
      setTimeLeft(newIsBreak ? 5 * 60 : 25 * 60);
      setIsActive(false);
      
      toast({
        title: newIsBreak ? 'Break Time!' : 'Work Time!',
        description: newIsBreak ? 'Take a 5 minute break' : 'Time to focus for 25 minutes',
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, toast]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Pomodoro Timer</h3>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${
          isBreak ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
        }`}>
          {isBreak ? 'Break' : 'Focus'}
        </span>
      </div>

      <div className="text-center mb-4">
        <div className="text-5xl font-bold text-primary mb-2">
          {formatTime(timeLeft)}
        </div>
        <p className="text-muted-foreground text-sm">
          {isBreak ? '5 minute break' : '25 minute focus session'}
        </p>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={toggleTimer} 
          className="flex-1"
          variant={isActive ? "outline" : "default"}
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
        <Button onClick={resetTimer} variant="outline" size="icon">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default PomodoroTimer;
