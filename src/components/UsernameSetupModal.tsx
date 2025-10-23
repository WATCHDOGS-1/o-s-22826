import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string; // Supabase Auth user ID
  initialDisplayName: string;
  onUsernameSet: (username: string) => void;
}

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

const UsernameSetupModal = ({ isOpen, onClose, userId, initialDisplayName, onUsernameSet }: UsernameSetupModalProps) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Suggest a username based on display name
    const suggested = initialDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(suggested.substring(0, 20));
  }, [initialDisplayName]);

  const checkUsernameAvailability = async (name: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', name)
      .maybeSingle();
    
    return !data && !error;
  };

  const handleSaveUsername = async () => {
    setError('');
    try {
      const validated = usernameSchema.parse(username);
      setLoading(true);

      const isAvailable = await checkUsernameAvailability(validated);
      if (!isAvailable) {
        setError('Username is already taken or invalid.');
        setLoading(false);
        return;
      }

      // 1. Update the 'users' table with the new username and display_name
      const { error: updateError } = await supabase
        .from('users')
        .update({ username: validated, display_name: validated })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // 2. Update the local storage display name (used by studyTracker)
      onUsernameSet(validated);

      toast({
        title: 'Success',
        description: `Username set to @${validated}`,
      });
      onClose();

    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
      } else {
        console.error('Error setting username:', e);
        setError('Failed to save username. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose a Username</DialogTitle>
          <DialogDescription>
            Welcome! Please choose a unique username for your profile and the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., study_master_24"
              className="col-span-3"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        </div>
        <Button onClick={handleSaveUsername} disabled={loading || username.length < 3}>
          {loading ? 'Saving...' : 'Save Username'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameSetupModal;