import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, Edit2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressStatsProps {
  userId: string;
  autoRefresh?: boolean;
}

const ProgressStats = ({ userId, autoRefresh = false }: ProgressStatsProps) => {
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [monthlyMinutes, setMonthlyMinutes] = useState(0);
  
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
    
    loadProgress();
    
    // Auto-refresh every minute if enabled
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadProgress();
      }, 60000); // 60 seconds
      
      return () => clearInterval(interval);
    }
  }, [userId, autoRefresh]);

  const loadProgress = async () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // Daily - use raw SQL via RPC with type assertion
      const { data: dailyData, error: dailyError } = await supabase.rpc(
        'get_daily_minutes' as any,
        { p_user_id: userId, p_date: today } as any
      );
      if (!dailyError) {
        setDailyMinutes(dailyData || 0);
      }

      // Weekly
      const { data: weeklyData, error: weeklyError } = await supabase.rpc(
        'get_period_minutes' as any,
        { p_user_id: userId, p_start_date: weekAgo } as any
      );
      if (!weeklyError) {
        setWeeklyMinutes(weeklyData || 0);
      }

      // Monthly
      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        'get_period_minutes' as any,
        { p_user_id: userId, p_start_date: monthAgo } as any
      );
      if (!monthlyError) {
        setMonthlyMinutes(monthlyData || 0);
      }
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
