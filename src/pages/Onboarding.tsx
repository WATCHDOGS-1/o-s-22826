import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

const usernameSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name is too long'),
});

const Onboarding = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // If not logged in, go to sign in
        navigate('/signin');
      } else if (profile) {
        // If profile already exists, onboarding is complete
        navigate('/home');
      } else {
        // Set initial display name from user metadata if available
        setDisplayName(user.user_metadata.full_name || user.email?.split('@')[0] || '');
      }
    }
  }, [user, profile, authLoading, navigate]);

  const checkUsernameAvailability = async (inputUsername: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', inputUsername)
      .maybeSingle();
    
    return !data && !error;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const validated = usernameSchema.parse({ username, displayName });
      
      const isAvailable = await checkUsernameAvailability(validated.username);
      if (!isAvailable) {
        toast({
          title: 'Error',
          description: 'Username is already taken. Please choose another.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // 1. Insert new user profile into the 'users' table and retrieve the DB ID
      const { error: insertError, data: insertedUser } = await supabase
        .from('users')
        .insert({
          user_id: user.id,
          username: validated.username,
          display_name: validated.displayName
        })
        .select('id')
        .single();

      if (insertError || !insertedUser) throw insertError || new Error("Failed to retrieve user ID.");
      const dbUserId = insertedUser.id;
      
      // 2. Initialize user_stats
      const { error: statsError } = await supabase.from('user_stats').insert({ user_id: dbUserId });
      if (statsError) console.error("Error initializing user_stats:", statsError);
      
      // 3. Initialize user_settings with defaults
      const { error: settingsError } = await supabase.from('user_settings').insert({ 
          user_id: dbUserId,
          daily_goal_minutes: 120,
          weekly_goal_minutes: 840,
          monthly_goal_minutes: 3600,
          pomodoro_work_minutes: 25,
          pomodoro_break_minutes: 5,
          streak_maintenance_minutes: 25,
      });
      if (settingsError) console.error("Error initializing user_settings:", settingsError);


      toast({
        title: 'Welcome!',
        description: 'Your profile is set up. Happy studying!'
      });
      
      // Redirect to home. AuthContext will automatically update the profile state.
      navigate('/home');

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else {
        console.error("Onboarding error:", error);
        toast({
          title: 'Error',
          description: 'Failed to set up profile. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || profile) {
    // Show loading or let useEffect handle redirect
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Welcome to OnlyFocus!</h1>
          <p className="text-muted-foreground">Just one more step to start focusing.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Unique Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe_focus"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">This must be unique and is used for your profile URL.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">This is what others will see in the room and leaderboard.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Onboarding;