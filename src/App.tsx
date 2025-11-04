import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import StudyRoom from './pages/StudyRoom';
import Profile from './pages/Profile';
import { Toaster } from './components/ui/toaster';

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/study" element={<StudyRoom />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
    <Toaster />
  </Router>
);

export default App;