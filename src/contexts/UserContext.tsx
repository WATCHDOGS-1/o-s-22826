import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  username: string | null;
  setUsername: (username: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    // Load username from localStorage on mount
    const savedUsername = localStorage.getItem('onlyfocus_username');
    if (savedUsername) {
      setUsernameState(savedUsername);
    }
  }, []);

  const setUsername = (username: string) => {
    localStorage.setItem('onlyfocus_username', username);
    setUsernameState(username);
  };

  const logout = () => {
    localStorage.removeItem('onlyfocus_username');
    setUsernameState(null);
  };

  return (
    <UserContext.Provider value={{ username, setUsername, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};