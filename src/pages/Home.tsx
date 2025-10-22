import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Users, Trophy, Clock, LogOut } from 'lucide-react';
import { setDisplayName } from '@/lib/userStorage';
import { supabase } from '@/integrations/supabase/client';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [displayNameInput, setDisplayNameInput] = useState('');

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

  const handleJoinRoom = () => {
    if (displayNameInput.trim()) {
      setDisplayName(displayNameInput.trim());
    }
    navigate('/study/global-room');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              OnlyFocus
            </h1>
            {user && (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
          <p className="text-xl text-muted-foreground">
            Focus together. Study smarter. Build streaks.
          </p>
        </header>

        {/* Main Card */}
        <Card className="max-w-lg mx-auto p-8 bg-gradient-to-br from-card to-secondary border-border mb-12">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Name (optional)
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12"
            >
              Join Global Study Room
            </Button>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 bg-card border-border text-center">
            <Users className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Live Webcam Rooms</h3>
            <p className="text-sm text-muted-foreground">Study together in real-time with live video cameras for accountability and motivation in virtual coworking spaces</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <Clock className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Pomodoro Timer</h3>
            <p className="text-sm text-muted-foreground">Track every study session with built-in focus timer. Your progress persists even when you refresh the page</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Daily Study Streaks</h3>
            <p className="text-sm text-muted-foreground">Build consistency by studying 25+ minutes daily. Track your longest streak and stay motivated with habit building</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Global Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Compete with students worldwide. See top performers by total study time and current streak length</p>
          </Card>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-12">
          <Button 
            onClick={() => navigate('/leaderboard')} 
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-1"
          >
            <Trophy className="h-5 w-5" />
            <span>Leaderboard</span>
          </Button>
          <Button 
            onClick={() => navigate('/profile')} 
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-1"
          >
            <Users className="h-5 w-5" />
            <span>Goals & Progress</span>
          </Button>
          <Button 
            onClick={() => navigate('/profile')} 
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-1"
          >
            <BookOpen className="h-5 w-5" />
            <span>My Stats</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
