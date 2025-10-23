import { useState } from 'react';
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
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
});

const UsernameSetup = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading...</div>;
  }

  if (!user) {
    navigate('/signin');
    return null;
  }

  if (profile?.username) {
    navigate('/home');
    return null;
  }

  const checkUsernameAvailability = async (name: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', name)
      .maybeSingle();
    
    return !data && !error;
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = usernameSchema.parse({ username });
      
      const isAvailable = await checkUsernameAvailability(validated.username);
      if (!isAvailable) {
        toast({
          title: 'Error',
          description: 'Username is already taken or invalid.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Update the user profile with the new username
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: validated.username })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: `Username @${validated.username} set!`,
      });
      
      // Force a refresh of the AuthContext to get the new profile data
      // Since AuthContext relies on the user object, we might need a full page refresh or a manual profile fetch, 
      // but navigating to home should trigger the AuthContext's profile fetch logic.
      navigate('/home');

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Welcome!</h1>
          <p className="text-muted-foreground">Choose a unique username to get started.</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe_focus"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">This will be your permanent public identifier.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Checking availability...' : 'Set Username'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UsernameSetup;