import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import { Toaster } from './components/Toaster';

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Index />} />
      
      {/* Add other routes here */}
      
      {/* Fallback route */}
      <Route path="*" element={<Index />} />
    </Routes>
    <Toaster />
  </Router>
);

export default App;