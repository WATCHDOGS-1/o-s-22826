import { Card } from '@/components/ui/card';
import { Flame, Zap } from 'lucide-react';
import { getStats } from '@/lib/localStore';
import React from 'react';

interface LocalStatsProps {
    refreshKey: number;
}

const LocalStats = ({ refreshKey }: LocalStatsProps) => {
  // Use refreshKey to force re-read from localStorage
  const stats = React.useMemo(() => getStats(), [refreshKey]);

  return (
    <Card className="p-6 bg-card border-border shadow-card">
      <h3 className="font-semibold text-foreground mb-4">Your Local Progress</h3>
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