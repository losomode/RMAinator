import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../services/api';
import { getToken, redirectToLogin } from '../utils/auth';
import type { User, AuthContextValue } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch current user from Authinator
    const loadUser = async (): Promise<void> => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user:', error);
        // Token invalid, will be handled by API interceptor
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Login/register are now handled by Authinator
  const login = (): void => {
    redirectToLogin();
  };

  const register = (): void => {
    redirectToLogin();
  };

  const logout = (): void => {
    // Clear token and redirect to Authinator
    localStorage.removeItem('auth_token');
    setUser(null);
    redirectToLogin();
  };
  
  const setUserFromSSO = (userData: User): void => {
    // Used by SSO callback to set user without full login flow
    setUser(userData);
  };

  const isAdmin = user?.role === 'ADMIN';

  const value: AuthContextValue = {
    user,
    login,
    register,
    logout,
    setUserFromSSO,
    isAdmin: isAdmin ?? false,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
