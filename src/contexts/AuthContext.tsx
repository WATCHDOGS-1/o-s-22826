import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { getUserId, setDisplayName } from '@/lib/userStorage';
import { ensureUser } from '@/lib/studyTracker';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authId: string; // Supabase Auth ID (user.id)
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authId, setAuthId] = useState(getUserId()); // Starts with anonymous ID

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // If logged in, use the real Auth ID
        setAuthId(currentUser.id);
        
        // Ensure user exists in our DB and update display name if necessary
        const displayName = currentUser.user_metadata.display_name || currentUser.user_metadata.full_name || currentUser.email?.split('@')[0] || 'Anonymous';
        setDisplayName(displayName);
        await ensureUser(currentUser.id, displayName);
        
      } else {
        // If logged out, revert to anonymous ID (or keep the existing one if it was anonymous)
        setAuthId(getUserId());
      }
      
      setLoading(false);
    });

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setAuthId(currentUser.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const isAnonymous = !user;

  return (
    <AuthContext.Provider value={{ user, loading, authId, isAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};