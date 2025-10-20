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
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleJoinRoom = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (displayNameInput.trim()) {
      setDisplayName(displayNameInput.trim());
    }
    navigate('/study/global-room');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
              {user ? 'Join Global Study Room' : 'Sign In to Join'}
            </Button>
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 bg-card border-border text-center">
            <Users className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Video Rooms</h3>
            <p className="text-sm text-muted-foreground">Study together with cameras</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <Clock className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Track Time</h3>
            <p className="text-sm text-muted-foreground">Monitor your study sessions</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Build Streaks</h3>
            <p className="text-sm text-muted-foreground">Study 25min+ daily</p>
          </Card>

          <Card className="p-6 bg-card border-border text-center">
            <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">Compete with others</p>
          </Card>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-12">
          <Button onClick={() => navigate('/leaderboard')} variant="outline">
            View Leaderboard
          </Button>
          <Button onClick={() => navigate('/profile')} variant="outline">
            My Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
