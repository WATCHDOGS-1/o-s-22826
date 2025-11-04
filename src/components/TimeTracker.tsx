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
    if (username) {
      loadStats();
    }
    const interval = setInterval(() => {
      if (isTracking) {
        setSessionTime((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, username]);

  const loadStats = async () => {
    if (!username) return;

    // Calculate start of day and start of week for RPC calls
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    // Adjust to Sunday (0) start of week
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); 
    const startOfWeekISO = startOfWeek.toISOString().split('T')[0];

    // Fetch daily and weekly minutes using RPCs
    const [{ data: dailyData }, { data: weeklyData }] = await Promise.all([
      supabase.rpc('get_daily_minutes', { p_date: today, p_user_id: username }),
      supabase.rpc('get_period_minutes', { p_start_date: startOfWeekISO, p_user_id: username }),
    ]);

    setDailyTime(dailyData || 0);
    setWeeklyTime(weeklyData || 0);
  };

  const startTracking = async () => {
    if (!username) return;
    
    // 1. Insert new session record
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: username,
        room_id: 'default_room', // Assuming a default room ID
        started_at: new Date().toISOString(),
        minutes_studied: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session tracking",
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
    if (!currentSessionId || !username) return;

    const minutes = Math.floor(sessionTime / 60);

    // 2. Update session record with end time and total minutes
    const { error: updateError } = await supabase
      .from('study_sessions')
      .update({
        ended_at: new Date().toISOString(),
        minutes_studied: minutes,
      })
      .eq('id', currentSessionId);

    if (updateError) {
      console.error('Error saving session:', updateError);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive",
      });
      return;
    }

    // 3. Update user stats (streak, total minutes, etc.)
    const { error: rpcError } = await supabase.rpc('update_user_study_stats', {
      p_user_id: username,
      p_minutes: minutes
    });
    
    if (rpcError) {
      console.error('Error updating stats:', rpcError);
      // We continue even if stats update fails, as the session was saved.
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