import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { username, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="glass border-b border-primary/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent text-glow">
          OnlyFocus
        </h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg border border-primary/30">
            <User size={18} className="text-primary" />
            <span className="font-medium text-primary">{username}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="hover:text-primary transition-colors"
          >
            <User className="mr-2" size={18} />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hover:text-destructive transition-colors"
          >
            <LogOut className="mr-2" size={18} />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;