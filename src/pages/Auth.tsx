import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/study');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/study`,
            data: {
              username: username,
            }
          },
        });
        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to OnlyFocus",
        });
        navigate('/study');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-primary bg-clip-text text-transparent text-glow">
          OnlyFocus
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          {isLogin ? 'Welcome back' : 'Join the focus revolution'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="glass border-primary/50 focus:border-primary transition-all"
                placeholder="Enter username"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass border-primary/50 focus:border-primary transition-all"
              placeholder="Enter email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass border-primary/50 focus:border-primary transition-all"
              placeholder="Enter password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary hover:opacity-90 transition-all glow text-white font-semibold"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </Button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
};

export default Auth;