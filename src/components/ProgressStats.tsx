import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressStatsProps {
  userId: string; // This should be the auth user id
  autoRefresh?: boolean;
}

const ProgressStats = ({ userId, autoRefresh = false }: ProgressStatsProps) => {
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [monthlyMinutes, setMonthlyMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dailyGoal, setDailyGoal] = useState(120);
  const [weeklyGoal, setWeeklyGoal] = useState(840);
  const [monthlyGoal, setMonthlyGoal] = useState(3600);

  useEffect(() => {
    loadData();
    
    const sessionsChannel = supabase
      .channel(`study_sessions_updates_for_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_sessions' },
        () => loadProgress()
      )
      .subscribe();

    const settingsChannel = supabase
      .channel(`user_settings_updates_for_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings' },
        () => loadData()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [userId, autoRefresh]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        setIsLoading(false);
        return;
      }
      const dbUserId = user.id;

      const { data: settings } = await supabase
        .from('user_settings')
        .select('daily_goal_minutes, weekly_goal_minutes, monthly_goal_minutes')
        .eq('user_id', dbUserId)
        .maybeSingle();
      
      if (settings) {
        setDailyGoal(settings.daily_goal_minutes);
        setWeeklyGoal(settings.weekly_goal_minutes);
        setMonthlyGoal(settings.monthly_goal_minutes);
      }

      await loadProgress(dbUserId);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async (dbUserIdToUse?: string) => {
    try {
      let dbUserId = dbUserIdToUse;
      if (!dbUserId) {
        const { data: user } = await supabase.from('users').select('id').eq('user_id', userId).maybeSingle();
        if (user) dbUserId = user.id;
      }
      if (!dbUserId) return;

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: dailyData } = await supabase.rpc('get_daily_minutes', { p_user_id: dbUserId, p_date: today });
      setDailyMinutes(dailyData || 0);

      const { data: weeklyData } = await supabase.rpc('get_period_minutes', { p_user_id: dbUserId, p_start_date: weekAgo });
      setWeeklyMinutes(weeklyData || 0);

      const { data: monthlyData } = await supabase.rpc('get_period_minutes', { p_user_id: dbUserId, p_start_date: monthAgo });
      setMonthlyMinutes(monthlyData || 0);
      
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Progress Goals</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-foreground font-medium">Daily</span>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">{formatMinutes(dailyMinutes)} /</span>
                <span className="text-muted-foreground">{formatMinutes(dailyGoal)}</span>
              </div>
            </div>
            <Progress value={(dailyMinutes / dailyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
          </div>

          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-foreground font-medium">Weekly</span>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">{formatMinutes(weeklyMinutes)} /</span>
                <span className="text-muted-foreground">{formatMinutes(weeklyGoal)}</span>
              </div>
            </div>
            <Progress value={(weeklyMinutes / weeklyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
          </div>

          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-foreground font-medium">Monthly</span>
              <div className="flex items-center gap-2">
                <span className="text-purple-400">{formatMinutes(monthlyMinutes)} /</span>
                <span className="text-muted-foreground">{formatMinutes(monthlyGoal)}</span>
              </div>
            </div>
            <Progress value={(monthlyMinutes / monthlyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProgressStats;