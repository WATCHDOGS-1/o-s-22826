import React, { useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { session, isLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [session, isLoading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <h1 className="text-4xl font-bold text-primary mb-4 animate-pulse">OnlyFocus</h1>
      <p className="text-lg text-muted-foreground">Loading application...</p>
    </div>
  );
};

export default Index;