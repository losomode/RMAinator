import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { getToken, redirectToLogin } from '../utils/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from Authinator
    const loadUser = async () => {
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
  const login = () => {
    redirectToLogin();
  };

  const register = () => {
    redirectToLogin();
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const { user: updatedUser } = response.data;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || 'Profile update failed'
      };
    }
  };

  const logout = () => {
    // Clear token and redirect to Authinator
    localStorage.removeItem('auth_token');
    setUser(null);
    redirectToLogin();
  };
  
  const setUserFromSSO = (userData) => {
    // Used by SSO callback to set user without full login flow
    setUser(userData);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isVerified = user?.is_verified === true;

  const value = {
    user,
    login,
    register,
    updateProfile,
    logout,
    setUserFromSSO,
    isAdmin,
    isVerified,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
