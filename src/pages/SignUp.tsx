import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home');
    }
  }, [user, authLoading, navigate]);

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    
    return !data && !error;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signupSchema.parse({ username, email, password });
      
      const isAvailable = await checkUsernameAvailability(validated.username);
      if (!isAvailable) {
        toast({
          title: 'Error',
          description: 'Username is already taken',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: validated.username,
            display_name: validated.username,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            user_id: authData.user.id,
            username: validated.username,
            display_name: validated.username
          });

        if (insertError) throw insertError;

        toast({
          title: 'Success',
          description: 'Account created successfully!'
        });
        // The auth listener will redirect to /home
      }
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

  const handleSignUpWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect to root path, HashRouter will handle the rest
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">OnlyFocus</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleSignUpWithGoogle} disabled={loading}>
          Sign Up with Google
        </Button>

        <div className="text-center text-sm mt-4">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/signin" className="text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignUp;