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
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userData.user_id);
        
        if (authError || !authData.user) {
          toast({
            title: 'Error',
            description: 'Unable to find user email',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        email = authData.user.email || '';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">OnlyFocus</h1>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usernameOrEmail">Username or Email</Label>
            <Input
              id="usernameOrEmail"
              type="text"
              placeholder="johndoe or you@example.com"
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

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SignIn;
