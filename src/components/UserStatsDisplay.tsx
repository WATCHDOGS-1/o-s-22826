import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { fetchUserStats, UserStats } from '@/lib/userStats';
import { Zap, Flame, Clock } from 'lucide-react';
import { showEncouragement, showError } from '@/lib/toast';

const UserStatsDisplay: React.FC = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (user) {
      setLoading(true);
      try {
        const userStats = await fetchUserStats(user.id);
        setStats(userStats);
      } catch (e) {
        showError("Could not load user statistics.");
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading stats...</div>;
  }

  if (!stats) {
    return <div className="text-center text-destructive">Stats unavailable.</div>;
  }

  const totalMinutes = stats.xp;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="animate-in fade-in duration-500 delay-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Focus XP</CardTitle>
          <Zap className="h-4 w-4 text-primary animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.xp} XP</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalHours}h {remainingMinutes}m total focused time
          </p>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in duration-500 delay-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Flame className="h-4 w-4 text-orange-500 animate-bounce" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.current_streak} Days</div>
          <p className="text-xs text-muted-foreground mt-1">
            Longest streak: {stats.longest_streak} days
          </p>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in duration-500 delay-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Session</CardTitle>
          <Clock className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.last_study_date ? stats.last_study_date : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Date of last recorded focus session
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatsDisplay;