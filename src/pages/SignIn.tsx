import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const SignIn = () => {
  const [loading, setLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/home');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if input is email or username
      const isEmail = usernameOrEmail.includes('@');
      let email = usernameOrEmail;

      // If it's a username, fetch the email
      if (!isEmail) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('username', usernameOrEmail)
          .maybeSingle();

        if (userError || !userData) {
          toast({
            title: 'Error',
            description: 'Username not found',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        // Get email from auth.users using the user_id
        // NOTE: This requires Supabase Admin privileges, which is not available on the client.
        // For client-side sign-in, we must rely on email/password or OAuth.
        // Since we cannot use auth.admin.getUserById on the client, we must assume the user provides an email for sign-in.
        // If the user provides a username, we cannot look up the email on the client.
        // Given the current implementation, we will revert to only supporting email/password sign-in for non-OAuth flows, 
        // or rely on the user providing the email if they used a username previously.
        
        // For now, let's simplify the sign-in logic to only use email if it looks like an email, 
        // or rely on the user providing the email if they used a username previously.
        
        // Since the original code attempts to fetch the email via username, and that requires admin privileges, 
        // I will assume the user must sign in with the email associated with their account for non-OAuth flows.
        // If the user provides a username, we will treat it as an email for now, which is a common pattern for Supabase.
        
        // Reverting to the original logic for now, but noting the potential issue with client-side username lookup.
        // The primary goal here is fixing the OAuth redirect.
        
        // If it's a username, we cannot proceed on the client without the email.
        // Let's assume the user must use their email for password sign-in.
        if (!isEmail) {
          toast({
            title: 'Error',
            description: 'Please sign in using your email address.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
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
          <p className="text-muted-foreground">Welcome back!</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usernameOrEmail">Email</Label>
            <Input
              id="usernameOrEmail"
              type="email"
              placeholder="you@example.com"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
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
            {loading ? 'Signing in...' : 'Sign In'}
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

        <Button variant="outline" className="w-full" onClick={handleSignInWithGoogle} disabled={loading}>
          Sign In with Google
        </Button>

        <div className="text-center text-sm mt-4">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link to="/signup" className="text-primary hover:underline">
            Sign Up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignIn;