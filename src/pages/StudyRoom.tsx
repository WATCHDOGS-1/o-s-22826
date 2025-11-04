import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import VideoGrid from '@/components/VideoGrid';
import TimeTracker from '@/components/TimeTracker';
import PomodoroTimer from '@/components/PomodoroTimer';
import Chat from '@/components/Chat';
import Leaderboard from '@/components/Leaderboard';
import Header from '@/components/Header';

const StudyRoom = () => {
  const { username } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) {
      navigate('/auth');
    }
  }, [username, navigate]);

  if (!username) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ top: '20%', left: '5%' }} />
        <div className="absolute w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ top: '60%', right: '5%', animationDelay: '3s' }} />
      </div>

      <Header />

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            <VideoGrid />
            <TimeTracker />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PomodoroTimer />
            <Leaderboard />
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyRoom;