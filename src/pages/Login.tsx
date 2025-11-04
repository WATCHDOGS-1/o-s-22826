import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';

const Login = () => {
  const navigate = useNavigate();
  const { session, isLoading } = useUser();

  useEffect(() => {
    if (session && !isLoading) {
      navigate('/dashboard');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card shadow-2xl rounded-xl border border-border/50 backdrop-blur-sm transition-all duration-500 hover:shadow-primary/50">
        <h1 className="text-4xl font-extrabold text-center text-primary animate-pulse">OnlyFocus</h1>
        <p className="text-center text-muted-foreground">Enter the future of focus.</p>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  defaultButtonBackground: 'hsl(var(--secondary))',
                  defaultButtonText: 'hsl(var(--secondary-foreground))',
                },
              },
            },
          }}
          theme="dark"
          view="sign_in"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email or Username',
                password_label: 'Password',
                email_input_placeholder: 'Your email or username',
                password_input_placeholder: 'Your password',
              },
              sign_up: {
                email_label: 'Email or Username',
                password_label: 'Password',
                email_input_placeholder: 'Your email or username',
                password_input_placeholder: 'Your password',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;