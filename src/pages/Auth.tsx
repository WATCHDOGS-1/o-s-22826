import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

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

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (username.length < 2) {
      toast({
        title: "Error",
        description: "Username must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    if (username.length > 20) {
      toast({
        title: "Error",
        description: "Username must be less than 20 characters",
        variant: "destructive",
      });
      return;
    }

    setUsername(username.trim());
    toast({
      title: "Welcome!",
      description: `Let's focus, ${username}! 🚀`,
    });
    navigate('/study');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" style={{ top: '10%', left: '10%' }} />
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ top: '60%', right: '10%', animationDelay: '2s' }} />
        <div className="absolute w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ bottom: '10%', left: '50%', animationDelay: '4s' }} />
      </div>

      <div className="glass w-full max-w-md p-8 rounded-2xl glow animate-slide-up relative z-10">
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
  );
};

export default Auth;