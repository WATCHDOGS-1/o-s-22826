import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FocusRoom from './pages/FocusRoom';
import { UserProvider } from './hooks/useUser';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/Toaster';

const App = () => (
  <UserProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/room" element={<FocusRoom />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Index />} />
      </Routes>
    </Router>
    <Toaster />
  </UserProvider>
);

export default App;