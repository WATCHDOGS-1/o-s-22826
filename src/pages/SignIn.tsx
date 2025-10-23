import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

const SignIn = () => {
  const [loading, setLoading] = useState(false);
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

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
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
          <p className="text-muted-foreground">Sign in to continue focusing</p>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-12 text-base" 
          onClick={handleSignInWithGoogle} 
          disabled={loading}
        >
          <LogIn className="h-5 w-5 mr-2" />
          {loading ? 'Redirecting...' : 'Sign In with Google'}
        </Button>

        <div className="text-center text-sm mt-6">
          <span className="text-muted-foreground">Need to reset your password? </span>
          <Link to="/reset-password" className="text-primary hover:underline">
            Contact Support
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default SignIn;