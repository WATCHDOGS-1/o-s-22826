import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  userId: string;
}

const Header: React.FC<HeaderProps> = ({ userId }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <header className="glass border-b border-primary/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent text-glow">
          OnlyFocus
        </h1>
        
        <div className="flex items-center gap-4">
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