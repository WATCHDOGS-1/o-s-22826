import { Card } from '@/components/ui/card';
import { Flame, Zap, Loader2 } from 'lucide-react';
import { getStats, UserStats } from '@/lib/userStats';
import React, { useEffect, useState } from 'react';

interface LocalStatsProps {
    refreshKey: number;
    userId: string;
}

const LocalStats = ({ refreshKey, userId }: LocalStatsProps) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const fetchedStats = await getStats(userId);
      setStats(fetchedStats);
      setIsLoading(false);
    };
    
    if (userId) {
        fetchStats();
    }
  }, [userId, refreshKey]);

  if (isLoading || !stats) {
    return (
        <Card className="p-6 bg-card border-border shadow-card flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <h3 className="font-semibold text-foreground mb-4">Your Progress</h3>
      <div className="flex justify-between gap-4">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.xp}</p>
            <p className="text-sm text-muted-foreground">XP Earned</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-primary" />
          <div>
            <p className="text-xl font-bold text-foreground">{stats.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Longest Streak: {stats.longestStreak} days</p>
    </Card>
  );
};

export default LocalStats;