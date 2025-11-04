import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import VideoGrid from '@/components/VideoGrid';
import TimeTracker from '@/components/TimeTracker';
import PomodoroTimer from '@/components/PomodoroTimer';
import Chat from '@/components/Chat';
import Leaderboard from '@/components/Leaderboard';
import Header from '@/components/Header';

const StudyRoom = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-glow">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ top: '20%', left: '5%' }} />
        <div className="absolute w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ top: '60%', right: '5%', animationDelay: '3s' }} />
      </div>

      <Header userId={user.id} />

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            <VideoGrid userId={user.id} />
            <TimeTracker userId={user.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PomodoroTimer />
            <Leaderboard />
            <Chat userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;