import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeTrackerProps {
  userId: string;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ userId }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [dailyTime, setDailyTime] = useState(0);
  const [weeklyTime, setWeeklyTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      if (isTracking) {
        setSessionTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  const loadStats = async () => {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('daily_minutes, weekly_minutes')
      .eq('user_id', userId)
      .single();

    if (stats) {
      setDailyTime(stats.daily_minutes);
      setWeeklyTime(stats.weekly_minutes);
    }
  };

  const startTracking = async () => {
    const { data, error } = await supabase
      .from('study_sessions')
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive",
      });
      return;
    }

    setCurrentSessionId(data.id);
    setIsTracking(true);
    setSessionTime(0);

    toast({
      title: "Session Started",
      description: "Focus mode activated! 🚀",
    });
  };

  const stopTracking = async () => {
    if (!currentSessionId) return;

    const minutes = Math.floor(sessionTime / 60);

    const { error } = await supabase
      .from('study_sessions')
      .update({
        ended_at: new Date().toISOString(),
        minutes_studied: minutes,
      })
      .eq('id', currentSessionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
      return;
    }

    setIsTracking(false);
    setCurrentSessionId(null);
    loadStats();

    toast({
      title: "Session Completed",
      description: `Great work! You studied for ${minutes} minutes! 🎉`,
    });
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass p-6 rounded-2xl glow animate-slide-up">
      <h2 className="text-2xl font-bold mb-6 text-glow">Time Tracker</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass p-4 rounded-xl border border-primary/30">
          <div className="text-sm text-muted-foreground mb-1">Session Time</div>
          <div className="text-3xl font-bold text-primary animate-pulse-glow">
            {formatTime(sessionTime)}
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-secondary/30">
          <div className="text-sm text-muted-foreground mb-1">Daily Total</div>
          <div className="text-3xl font-bold text-secondary">
            {dailyTime} min
          </div>
        </div>

        <div className="glass p-4 rounded-xl border border-accent/30">
          <div className="text-sm text-muted-foreground mb-1">Weekly Total</div>
          <div className="text-3xl font-bold text-accent">
            {weeklyTime} min
          </div>
        </div>
      </div>

      <Button
        onClick={isTracking ? stopTracking : startTracking}
        className={`w-full ${isTracking ? 'bg-destructive' : 'bg-gradient-primary'} hover:opacity-90 transition-all glow-strong text-white font-semibold text-lg py-6`}
      >
        {isTracking ? (
          <>
            <Pause className="mr-2" /> Stop Session
          </>
        ) : (
          <>
            <Play className="mr-2" /> Start Session
          </>
        )}
      </Button>
    </div>
  );
};

export default TimeTracker;