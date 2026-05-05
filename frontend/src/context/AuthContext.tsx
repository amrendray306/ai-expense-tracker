import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  monthlyBudget?: number;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  updateUser: (userData: Partial<User>) => void; // Silent update without redirect
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Legacy support for cached users with _id
      if (parsedUser._id && !parsedUser.id) {
        parsedUser.id = parsedUser._id;
      }
      setUser(parsedUser);
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/');
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...userData };
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
