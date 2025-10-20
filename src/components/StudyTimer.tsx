import { Timer, Flame, Pause, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StudyTimerProps {
  isActive: boolean;
  currentStreak: number;
  sessionDuration: number;
  onPauseToggle?: () => void;
  isPaused?: boolean;
}

const StudyTimer = ({ isActive, currentStreak, sessionDuration, onPauseToggle, isPaused = false }: StudyTimerProps) => {
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    };
  };

  const time = formatTime(sessionDuration);
  const totalMinutes = Math.floor(sessionDuration / 60);

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Study Timer</h3>
        </div>
        <div className="flex items-center gap-2">
          {onPauseToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onPauseToggle}
              className="h-8 w-8"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play className="h-4 w-4 text-primary" />
              ) : (
                <Pause className="h-4 w-4 text-primary" />
              )}
            </Button>
          )}
          <div className="flex items-center gap-2 bg-primary/20 px-3 py-1 rounded-full">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{currentStreak} day streak</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-5xl font-bold text-primary mb-2">
          <span>{time.hours}</span>
          <span className="text-muted-foreground">:</span>
          <span>{time.minutes}</span>
          <span className="text-muted-foreground">:</span>
          <span>{time.seconds}</span>
        </div>
        <p className="text-muted-foreground">
          {totalMinutes} {totalMinutes === 1 ? 'minute' : 'minutes'} studied
        </p>
      </div>
    </Card>
  );
};

export default StudyTimer;
