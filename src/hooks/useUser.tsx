import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface UserContextType {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleAuthChange = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      
      if (sessionUser) {
        setUser(sessionUser);
        setIsLoading(false);
        return;
      }

      // If no user, sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error("Anonymous sign-in failed:", error.message); // Log specific error message
        toast.error("Authentication Failed", {
          description: "Could not sign in anonymously. Please try refreshing. Check console for details.",
        });
        setIsLoading(false);
      } else if (data.user) {
        setUser(data.user);
        setIsLoading(false);
      }
    };

    handleAuthChange();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id ?? null;

  return (
    <UserContext.Provider value={{ user, userId, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};