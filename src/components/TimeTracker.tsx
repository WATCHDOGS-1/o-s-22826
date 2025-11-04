import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

const TimeTracker: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [dailyTime, setDailyTime] = useState(0);
  const [weeklyTime, setWeeklyTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { username } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      if (isTracking) {
        setSessionTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, username]);

  const loadStats = async () => {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', username)
      .maybeSingle();

    if (stats) {
      setDailyTime(stats.daily_minutes || 0);
      setWeeklyTime(stats.weekly_minutes || 0);
    }
  };

  const startTracking = () => {
    const sessionId = Math.random().toString(36).substr(2, 9);
    setCurrentSessionId(sessionId);
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
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
      return;
    }

    // Update stats
    await supabase.rpc('update_user_study_stats', {
      p_user_id: username,
      p_minutes: minutes
    });

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
    <div className="glass p-4 rounded-2xl glow animate-slide-up">
      <h2 className="text-xl font-bold mb-4 text-glow">Time Tracker</h2>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="glass p-3 rounded-xl border border-primary/30">
          <div className="text-xs text-muted-foreground mb-1">Session</div>
          <div className="text-2xl font-bold text-primary animate-pulse-glow">
            {formatTime(sessionTime)}
          </div>
        </div>

        <div className="glass p-3 rounded-xl border border-secondary/30">
          <div className="text-xs text-muted-foreground mb-1">Daily</div>
          <div className="text-2xl font-bold text-secondary">
            {dailyTime} min
          </div>
        </div>

        <div className="glass p-3 rounded-xl border border-accent/30">
          <div className="text-xs text-muted-foreground mb-1">Weekly</div>
          <div className="text-2xl font-bold text-accent">
            {weeklyTime} min
          </div>
        </div>
      </div>

      <Button
        onClick={isTracking ? stopTracking : startTracking}
        className={`w-full ${isTracking ? 'bg-destructive' : 'bg-gradient-primary'} hover:opacity-90 transition-all glow text-white font-semibold py-4`}
      >
        {isTracking ? (
          <>
            <Pause className="mr-2" size={16} /> Stop
          </>
        ) : (
          <>
            <Play className="mr-2" size={16} /> Start
          </>
        )}
      </Button>
    </div>
  );
};

export default TimeTracker;