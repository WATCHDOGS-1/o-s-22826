import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  total_minutes: number;
}

const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    loadLeaderboard();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLeaderboard = async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_id, total_minutes')
      .order('total_minutes', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading leaderboard:', error);
      return;
    }

    if (data) {
      setLeaders(data);
    }
  };

  return (
    <div className="glass p-6 rounded-2xl glow animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-accent" />
        <h2 className="text-2xl font-bold text-glow">Top Focusers 🏆</h2>
      </div>

      <div className="space-y-3">
        {leaders.map((leader, index) => (
          <div
            key={leader.user_id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-105 ${
              index === 0
                ? 'border-accent bg-accent/10 glow-strong'
                : index === 1
                ? 'border-secondary bg-secondary/10'
                : index === 2
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card/50'
            }`}
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
              index === 0 ? 'bg-accent text-white' :
              index === 1 ? 'bg-secondary text-white' :
              index === 2 ? 'bg-primary text-white' :
              'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </div>

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary bg-gradient-primary flex items-center justify-center font-bold text-white">
              {leader.user_id[0]?.toUpperCase()}
            </div>

            <div className="flex-1">
              <div className="font-medium">{leader.user_id}</div>
              <div className="text-sm text-muted-foreground">
                {Math.floor(leader.total_minutes / 60)}h {leader.total_minutes % 60}m
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;