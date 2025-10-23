import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

export interface UserProfile {
  id: string; // DB ID
  user_id: string; // Auth ID
  username: string;
  display_name: string;
  bio: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // useNavigate hook must be used inside a component rendered within the Router
  // Since AuthProvider is inside HashRouter in App.tsx, this is safe.
  const navigate = useNavigate(); 

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfile(data as UserProfile);
        } else if (error && error.code === 'PGRST116') { // PGRST116: No rows found
          // User is logged in via Auth, but no profile exists in 'users' table (e.g., OAuth first sign-in)
          setProfile(null);
          // Redirect to onboarding to complete profile setup
          if (window.location.hash !== '#/onboarding') {
            navigate('/onboarding');
          }
        } else if (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    };

    if (!loading) {
      fetchProfile();
    }
  }, [user, loading, navigate]);

  const value = {
    user,
    profile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};