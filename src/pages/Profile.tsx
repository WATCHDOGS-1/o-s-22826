import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const Profile = () => {
  const { username: currentUsername, setUsername } = useUser();
  const [username, setUsernameInput] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUsername) {
      navigate('/auth');
      return;
    }
    setUsernameInput(currentUsername);
  }, [currentUsername, navigate]);

  const updateProfile = () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (username.length < 2 || username.length > 20) {
      toast({
        title: "Error",
        description: "Username must be 2-20 characters",
        variant: "destructive",
      });
      return;
    }

    setUsername(username.trim());
    toast({
      title: "Success",
      description: "Username updated successfully!",
    });
  };

  if (!currentUsername) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ top: '20%', left: '10%' }} />
        <div className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ bottom: '20%', right: '10%', animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/study')}
          className="mb-8 hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2" /> Back to Study Room
        </Button>

        <div className="max-w-2xl mx-auto glass p-8 rounded-2xl glow animate-slide-up">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-primary bg-clip-text text-transparent">
            Your Profile
          </h1>

          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary glow-strong bg-gradient-primary flex items-center justify-center text-5xl font-bold text-white">
              {username[0]?.toUpperCase() || '?'}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="glass border-primary/50 focus:border-primary transition-all"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {username.length}/20 characters
              </p>
            </div>

            <Button
              onClick={updateProfile}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all glow text-white font-semibold"
            >
              Update Username
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;