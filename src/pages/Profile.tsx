import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, User, Clock, Flame, Trophy, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getUserId, getDisplayName, setDisplayName } from '@/lib/userStorage';
import { getUserStats, ensureUser } from '@/lib/studyTracker';
import { useToast } from '@/hooks/use-toast';
import ProgressStats from '@/components/ProgressStats';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    total_minutes: 0,
    current_streak: 0,
    longest_streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(getDisplayName() || '');

  const userId = getUserId();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/signin');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/signin');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    await ensureUser(userId, getDisplayName() || undefined);
    const userStats = await getUserStats(userId);
    if (userStats) {
      setStats(userStats);
    }
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (nameInput.trim()) {
      setDisplayName(nameInput.trim());
      await ensureUser(userId, nameInput.trim());
      setIsEditingName(false);
      toast({
        title: 'Name Updated',
        description: 'Your display name has been updated',
      });
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-primary text-xl mb-4">Loading...</div>
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
              My Profile
            </h1>
            <p className="text-muted-foreground mt-2">Track your study progress</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-card to-secondary border-border mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>

            <div className="flex-1">
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1"
                  />
                  <Button onClick={handleSaveName}>Save</Button>
                  <Button variant="outline" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {getDisplayName() || 'Anonymous User'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingName(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">User ID: {userId}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading stats...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Time */}
              <div className="text-center p-6 bg-background/50 rounded-lg border border-border">
                <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatMinutes(stats.total_minutes)}
                </div>
                <p className="text-sm text-muted-foreground">Total Study Time</p>
              </div>

              {/* Current Streak */}
              <div className="text-center p-6 bg-background/50 rounded-lg border border-border">
                <Flame className="h-8 w-8 text-accent mx-auto mb-3" />
                <div className="text-3xl font-bold text-accent mb-1">
                  {stats.current_streak}
                </div>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>

              {/* Longest Streak */}
              <div className="text-center p-6 bg-background/50 rounded-lg border border-border">
                <Trophy className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">
                  {stats.longest_streak}
                </div>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
              </div>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="max-w-2xl mx-auto p-6 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-4">How Streaks Work</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Study for at least 25 minutes per day to maintain your streak</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Your current streak resets if you miss a day</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Compete on the leaderboard by studying more each week</span>
            </li>
          </ul>
        </Card>

        {/* Progress Stats */}
        <div className="max-w-2xl mx-auto mb-8">
          <ProgressStats userId={userId} />
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={() => navigate('/home')} variant="outline">
            Back to Home
          </Button>
          <Button onClick={() => navigate('/leaderboard')} variant="outline">
            View Leaderboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
