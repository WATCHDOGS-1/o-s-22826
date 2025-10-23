import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Users, Trophy, Clock, LogOut } from 'lucide-react';
import { setDisplayName, getDisplayName } from '@/lib/userStorage';
import { supabase } from '@/integrations/supabase/client';
import UsernameSetupModal from '@/components/UsernameSetupModal';
import { useAuth } from '@/contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, authId } = useAuth();
  
  const [dbUser, setDbUser] = useState<any>(null);
  const [displayNameInput, setDisplayNameInput] = useState(getDisplayName() || '');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
      return;
    }
    
    if (user) {
      // Load DB user data to check for username
      const loadDbUser = async () => {
        const { data: dbUserData, error } = await supabase
          .from('users')
          .select('display_name, username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching DB user data:', error);
          return;
        }

        if (dbUserData) {
          setDbUser(dbUserData);
          
          // If display name is not set in local storage, use the one from DB
          if (!getDisplayName() || getDisplayName() === 'Anonymous') {
            const name = dbUserData.display_name || dbUserData.username || user.user_metadata.full_name || user.email?.split('@')[0] || 'Anonymous';
            setDisplayName(name);
            setDisplayNameInput(name);
          }
          
          // Check if username is missing (typical for OAuth sign-ins)
          if (!dbUserData.username) {
            setIsSetupModalOpen(true);
          }
        }
      };
      loadDbUser();
    }
  }, [user, authLoading, navigate]);

  const handleJoinRoom = () => {
    const finalDisplayName = displayNameInput.trim() || (dbUser?.display_name || 'Anonymous');
    setDisplayName(finalDisplayName);
    navigate('/study/global-room');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  
  const handleUsernameSet = (username: string) => {
    // Update local state and storage after username is set via modal
    setDisplayName(username);
    setDisplayNameInput(username);
    setDbUser((prev: any) => ({ ...prev, username, display_name: username }));
    setIsSetupModalOpen(false);
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-primary text-xl mb-4">Loading session...</div>
        </div>
      </div>
    );
  }

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
                Display Name (used in room chat)
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
      
      {user && isSetupModalOpen && (
        <UsernameSetupModal 
          isOpen={isSetupModalOpen}
          onClose={() => setIsSetupModalOpen(false)}
          userId={user.id}
          initialDisplayName={user.user_metadata.full_name || user.email?.split('@')[0] || ''}
          onUsernameSet={handleUsernameSet}
        />
      )}
    </div>
  );
};

export default Home;