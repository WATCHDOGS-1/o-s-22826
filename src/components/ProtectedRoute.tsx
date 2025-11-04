import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';

const ProtectedRoute = () => {
  const { session, isLoading } = useUser();

  if (isLoading) {
    // Render a loading state while checking session
    return <div className="min-h-screen flex items-center justify-center text-xl">Authenticating...</div>;
  }

  if (!session) {
    // Redirect unauthenticated users to the login page
    return <Navigate to="/login" replace />;
  }

  // Render the child routes if authenticated
  return <Outlet />;
};

export default ProtectedRoute;