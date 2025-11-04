import React from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  onFocusSessionComplete: (durationSeconds: number) => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onFocusSessionComplete }) => {
  const {
    minutes,
    seconds,
    phase,
    cycle,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
  } = usePomodoro(onFocusSessionComplete);

  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const phaseColor = cn({
    'text-primary': phase === 'Focus',
    'text-green-500': phase === 'Short Break',
    'text-blue-500': phase === 'Long Break',
  });

  return (
    <div className="p-6 bg-card rounded-xl shadow-2xl border border-border/50 backdrop-blur-sm text-center transition-all duration-500 hover:shadow-primary/50">
      <div className="mb-4">
        <h3 className={cn("text-2xl font-bold tracking-wider transition-colors duration-500", phaseColor)}>
          {phase}
        </h3>
        <p className="text-sm text-muted-foreground">Cycle: {cycle}</p>
      </div>

      <div className={cn("text-8xl font-mono font-extrabold mb-6 transition-all duration-500", phaseColor)}>
        {formattedTime}
      </div>

      <div className="flex justify-center space-x-4">
        {isRunning ? (
          <Button onClick={pauseTimer} variant="secondary" size="lg" className="w-24 transition-transform duration-300 hover:scale-105">
            <Pause className="mr-2 h-5 w-5" /> Pause
          </Button>
        ) : (
          <Button onClick={startTimer} size="lg" className="w-24 transition-transform duration-300 hover:scale-105">
            <Play className="mr-2 h-5 w-5" /> Start
          </Button>
        )}
        
        <Button onClick={skipPhase} variant="outline" size="lg" className="transition-transform duration-300 hover:scale-105">
          <SkipForward className="h-5 w-5" />
        </Button>
        
        <Button onClick={resetTimer} variant="destructive" size="lg" className="transition-transform duration-300 hover:scale-105">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default PomodoroTimer;