import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, ArrowLeft, Clock, Medal } from 'lucide-react';
import { getWeeklyLeaderboard } from '@/lib/studyTracker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_minutes: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    } else if (user) {
      loadLeaderboard();
    }
  }, [user, authLoading, navigate]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await getWeeklyLeaderboard();
    setLeaderboard(data as LeaderboardEntry[]);
    setLoading(false);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Medal className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Medal className="h-6 w-6 text-amber-600" />;
    return null;
  };
  
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-primary text-xl mb-4">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Weekly Leaderboard
            </h1>
            <p className="text-muted-foreground mt-2">Top studiers this week</p>
          </div>
          <Trophy className="h-12 w-12 text-primary" />
        </div>

        {/* Leaderboard */}
        <Card className="max-w-3xl mx-auto bg-gradient-to-br from-card to-secondary border-border">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No data yet. Be the first to study!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`p-6 flex items-center gap-4 hover:bg-secondary/50 transition-colors ${
                    index < 3 ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary font-bold text-lg">
                    {getMedalIcon(index) || <span className="text-muted-foreground">#{index + 1}</span>}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{entry.display_name}</p>
                    <p className="text-sm text-muted-foreground">User ID: {entry.user_id}</p>
                  </div>

                  <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-bold text-primary">{formatMinutes(entry.total_minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="text-center mt-8">
          <Button onClick={() => navigate('/home')} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;