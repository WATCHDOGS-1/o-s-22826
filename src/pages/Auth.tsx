import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import Leaderboard from '@/components/Leaderboard';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [username, setUsernameInput] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { username: currentUsername, setUsername } = useUser();

  useEffect(() => {
    // If already has username, redirect to study
    if (currentUsername) {
      navigate('/study');
    }
  }, [currentUsername, navigate]);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (trimmedUsername.length < 2) {
      toast({
        title: "Error",
        description: "Username must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    if (trimmedUsername.length > 20) {
      toast({
        title: "Error",
        description: "Username must be less than 20 characters",
        variant: "destructive",
      });
      return;
    }

    // 1. Upsert profile into Supabase using the username as the ID
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: trimmedUsername, 
        username: trimmedUsername 
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      toast({
        title: "Database Error",
        description: "Could not register profile. Try again.",
        variant: "destructive",
      });
      return;
    }

    // 2. Set local session and navigate
    setUsername(trimmedUsername);
    toast({
      title: "Welcome!",
      description: `Let's focus, ${trimmedUsername}! 🚀`,
    });
    navigate('/study');
  };

  return (
    <div className="min-h-screen p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" style={{ top: '10%', left: '10%' }} />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ top: '60%', right: '10%', animationDelay: '2s' }} />
        <div className="absolute w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ bottom: '10%', left: '50%', animationDelay: '4s' }} />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pt-8">
          {/* Auth Section */}
          <div className="flex items-center justify-center">
            <div className="glass w-full max-w-md p-8 rounded-2xl glow animate-slide-up">
              <h1 className="text-6xl font-bold text-center mb-2 bg-gradient-primary bg-clip-text text-transparent text-glow">
                OnlyFocus
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                Enter your username to start focusing
              </p>

              <form onSubmit={handleEnter} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Choose your focus name"
                    className="glass border-primary/50 focus:border-primary transition-all text-lg py-6"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all glow-strong text-white font-semibold text-lg py-6"
                >
                  Enter Focus Mode 🚀
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                No signup required • Your username is stored locally
              </p>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="flex items-start justify-center">
            <div className="w-full max-w-md">
              <Leaderboard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;