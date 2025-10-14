import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, Edit2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressStatsProps {
  userId: string; // This should be the localStorage userId (text), not auth user id
  autoRefresh?: boolean;
}

const ProgressStats = ({ userId, autoRefresh = false }: ProgressStatsProps) => {
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [monthlyMinutes, setMonthlyMinutes] = useState(0);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  
  const [dailyGoal, setDailyGoal] = useState(120);
  const [weeklyGoal, setWeeklyGoal] = useState(840);
  const [monthlyGoal, setMonthlyGoal] = useState(3600);
  
  const [editingDaily, setEditingDaily] = useState(false);
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [editingMonthly, setEditingMonthly] = useState(false);
  
  const [tempDailyGoal, setTempDailyGoal] = useState('120');
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState('840');
  const [tempMonthlyGoal, setTempMonthlyGoal] = useState('3600');

  useEffect(() => {
    // Load goals from localStorage
    const savedDailyGoal = localStorage.getItem('daily_goal');
    const savedWeeklyGoal = localStorage.getItem('weekly_goal');
    const savedMonthlyGoal = localStorage.getItem('monthly_goal');
    
    if (savedDailyGoal) {
      setDailyGoal(parseInt(savedDailyGoal));
      setTempDailyGoal(savedDailyGoal);
    }
    if (savedWeeklyGoal) {
      setWeeklyGoal(parseInt(savedWeeklyGoal));
      setTempWeeklyGoal(savedWeeklyGoal);
    }
    if (savedMonthlyGoal) {
      setMonthlyGoal(parseInt(savedMonthlyGoal));
      setTempMonthlyGoal(savedMonthlyGoal);
    }
    
    // Get database user ID from localStorage userId
    const fetchDbUserId = async () => {
      console.log('Fetching DB user ID for:', userId);
      const { data: user, error } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log('DB User fetch result:', { user, error });
      if (user) {
        setDbUserId(user.id);
        console.log('Set dbUserId to:', user.id);
      }
    };
    
    fetchDbUserId();
  }, [userId]);

  useEffect(() => {
    if (!dbUserId) {
      console.log('No dbUserId yet, waiting...');
      return;
    }
    
    console.log('Loading progress for dbUserId:', dbUserId);
    loadProgress();
    
    // Subscribe to realtime updates for study_sessions
    const channel = supabase
      .channel('study_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions'
        },
        () => {
          console.log('Realtime update detected, reloading progress');
          loadProgress();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbUserId, autoRefresh]);

  const loadProgress = async () => {
    if (!dbUserId) {
      console.log('loadProgress called but no dbUserId');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('Loading progress with params:', { dbUserId, today, weekAgo, monthAgo });

    try {
      // Daily - use database user UUID
      const { data: dailyData, error: dailyError } = await (supabase.rpc as any)(
        'get_daily_minutes',
        { p_user_id: dbUserId, p_date: today }
      );
      console.log('Daily result:', { dailyData, dailyError });
      if (!dailyError) {
        setDailyMinutes((dailyData as number) || 0);
      } else {
        console.error('Daily error:', dailyError);
      }

      // Weekly
      const { data: weeklyData, error: weeklyError } = await (supabase.rpc as any)(
        'get_period_minutes',
        { p_user_id: dbUserId, p_start_date: weekAgo }
      );
      console.log('Weekly result:', { weeklyData, weeklyError });
      if (!weeklyError) {
        setWeeklyMinutes((weeklyData as number) || 0);
      } else {
        console.error('Weekly error:', weeklyError);
      }

      // Monthly
      const { data: monthlyData, error: monthlyError } = await (supabase.rpc as any)(
        'get_period_minutes',
        { p_user_id: dbUserId, p_start_date: monthAgo }
      );
      console.log('Monthly result:', { monthlyData, monthlyError });
      if (!monthlyError) {
        setMonthlyMinutes((monthlyData as number) || 0);
      } else {
        console.error('Monthly error:', monthlyError);
      }
      
      console.log('Final state:', { dailyMinutes: dailyData, weeklyMinutes: weeklyData, monthlyMinutes: monthlyData });
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };
  
  const saveGoal = (type: 'daily' | 'weekly' | 'monthly', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue <= 0) return;
    
    if (type === 'daily') {
      setDailyGoal(numValue);
      localStorage.setItem('daily_goal', value);
      setEditingDaily(false);
    } else if (type === 'weekly') {
      setWeeklyGoal(numValue);
      localStorage.setItem('weekly_goal', value);
      setEditingWeekly(false);
    } else {
      setMonthlyGoal(numValue);
      localStorage.setItem('monthly_goal', value);
      setEditingMonthly(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Progress Goals</h3>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-foreground font-medium">Daily</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">
                {formatMinutes(dailyMinutes)} / 
              </span>
              {editingDaily ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tempDailyGoal}
                    onChange={(e) => setTempDailyGoal(e.target.value)}
                    className="w-20 h-7 text-xs"
                    min="1"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => saveGoal('daily', tempDailyGoal)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{formatMinutes(dailyGoal)}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => setEditingDaily(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Progress value={(dailyMinutes / dailyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
        </div>

        <div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-foreground font-medium">Weekly</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">
                {formatMinutes(weeklyMinutes)} / 
              </span>
              {editingWeekly ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tempWeeklyGoal}
                    onChange={(e) => setTempWeeklyGoal(e.target.value)}
                    className="w-20 h-7 text-xs"
                    min="1"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => saveGoal('weekly', tempWeeklyGoal)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{formatMinutes(weeklyGoal)}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => setEditingWeekly(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Progress value={(weeklyMinutes / weeklyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
        </div>

        <div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-foreground font-medium">Monthly</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">
                {formatMinutes(monthlyMinutes)} / 
              </span>
              {editingMonthly ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={tempMonthlyGoal}
                    onChange={(e) => setTempMonthlyGoal(e.target.value)}
                    className="w-20 h-7 text-xs"
                    min="1"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => saveGoal('monthly', tempMonthlyGoal)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{formatMinutes(monthlyGoal)}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => setEditingMonthly(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Progress value={(monthlyMinutes / monthlyGoal) * 100} className="h-2 [&>div]:bg-purple-500" />
        </div>
      </div>
    </Card>
  );
};

export default ProgressStats;
