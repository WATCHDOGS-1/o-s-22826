import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timer, Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const PomodoroTimer = () => {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedWork = localStorage.getItem('pomodoro_work');
    const savedBreak = localStorage.getItem('pomodoro_break');
    
    if (savedWork) {
      const work = parseInt(savedWork);
      setWorkDuration(work);
      setTimeLeft(work * 60);
    }
    if (savedBreak) {
      setBreakDuration(parseInt(savedBreak));
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      const newIsBreak = !isBreak;
      setIsBreak(newIsBreak);
      setTimeLeft(newIsBreak ? breakDuration * 60 : workDuration * 60);
      setIsActive(false);
      
      toast({
        title: newIsBreak ? 'Break Time!' : 'Work Time!',
        description: newIsBreak 
          ? `Take a ${breakDuration} minute break` 
          : `Time to focus for ${workDuration} minutes`,
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak, toast, workDuration, breakDuration]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
  };

  const saveSettings = () => {
    if (workDuration > 0 && breakDuration > 0) {
      localStorage.setItem('pomodoro_work', workDuration.toString());
      localStorage.setItem('pomodoro_break', breakDuration.toString());
      
      if (!isActive) {
        setTimeLeft(isBreak ? breakDuration * 60 : workDuration * 60);
      }
      
      setSettingsOpen(false);
      toast({
        title: 'Settings Saved',
        description: `${workDuration}min work, ${breakDuration}min break`,
      });
    }
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
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full ${
            isBreak ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
          }`}>
            {isBreak ? 'Break' : 'Focus'}
          </span>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pomodoro Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="work">Work Duration (minutes)</Label>
                  <Input
                    id="work"
                    type="number"
                    min="1"
                    max="120"
                    value={workDuration}
                    onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break">Break Duration (minutes)</Label>
                  <Input
                    id="break"
                    type="number"
                    min="1"
                    max="60"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(parseInt(e.target.value) || 5)}
                  />
                </div>
                <Button onClick={saveSettings} className="w-full">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-5xl font-bold text-primary mb-2">
          {formatTime(timeLeft)}
        </div>
        <p className="text-muted-foreground text-sm">
          {isBreak ? `${breakDuration} minute break` : `${workDuration} minute focus session`}
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
