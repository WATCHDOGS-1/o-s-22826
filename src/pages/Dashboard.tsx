import React, { useCallback, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import PomodoroTimer from '@/components/PomodoroTimer';
import UserStatsDisplay from '@/components/UserStatsDisplay';
import Leaderboard from '@/components/Leaderboard';
import { updateFocusTime } from '@/lib/userStats';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/lib/toast';

const Dashboard = () => {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFocusSessionComplete = useCallback(async (durationSeconds: number) => {
    if (user && !isUpdating) {
      setIsUpdating(true);
      await updateFocusTime(user.id, durationSeconds);
      setIsUpdating(false);
      // Optionally refresh stats display here if needed
    }
  }, [user, isUpdating]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to log out.");
      console.error("Logout error:", error);
    } else {
      navigate('/login');
    }
  };

  const userName = profile?.first_name || user?.email || 'User';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-foreground animate-in fade-in duration-1000">
          Welcome back, <span className="text-primary">{userName}</span>!
        </h1>
        <div className="flex space-x-4">
          <Button onClick={() => navigate('/room')} variant="default" className="animate-in slide-in-from-right-4 duration-500">
            <Users className="mr-2 h-4 w-4" /> Global Focus Room
          </Button>
          <Button onClick={handleLogout} variant="destructive" className="animate-in slide-in-from-right-4 duration-500 delay-100">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <section className="mb-10">
        <UserStatsDisplay />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <PomodoroTimer onFocusSessionComplete={handleFocusSessionComplete} />
        </div>
        <div className="lg:col-span-2">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;