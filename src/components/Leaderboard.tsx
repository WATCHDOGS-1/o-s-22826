import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchLeaderboard } from '@/lib/userStats';
import { Zap, Trophy, Flame } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  xp: number;
  streak: number;
  name: string;
  avatar_url: string | null;
}

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      const data = await fetchLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    };
    loadLeaderboard();
  }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 text-yellow-900";
    if (rank === 2) return "bg-slate-400 text-slate-900";
    if (rank === 3) return "bg-amber-700 text-amber-900";
    return "bg-muted text-muted-foreground";
  };

  if (loading) {
    return <Card className="p-6 text-center">Loading Leaderboard...</Card>;
  }

  return (
    <Card className="animate-in slide-in-from-bottom-4 duration-700">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-6 w-6 mr-2 text-yellow-500 animate-pulse" />
          Global Focus Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 p-4">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-all duration-300 hover:bg-accent/50",
                entry.rank <= 3 && "bg-accent/20 border border-primary/30"
              )}
            >
              <div className="flex items-center space-x-4">
                <span className={cn("w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm", getRankStyle(entry.rank))}>
                  {entry.rank}
                </span>
                <Avatar>
                  <AvatarImage src={entry.avatar_url || undefined} alt={entry.name} />
                  <AvatarFallback>{entry.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{entry.name}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Flame className="h-4 w-4 mr-1 text-orange-500" />
                  {entry.streak}
                </span>
                <span className="flex items-center font-bold text-primary">
                  <Zap className="h-4 w-4 mr-1" />
                  {entry.xp} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Leaderboard;