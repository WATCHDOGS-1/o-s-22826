import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import StudyRoom from './pages/StudyRoom';
import Profile from './pages/Profile';
import { Toaster } from './components/ui/toaster';
import { UserProvider } from './contexts/UserContext';

const App = () => (
  <Router>
    <UserProvider>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/study" element={<StudyRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </UserProvider>
  </Router>
);

export default App;