import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from '../types/auth.types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('intellmeet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('intellmeet_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify user session on load
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('intellmeet_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          setUser(response.data.data.user);
          localStorage.setItem(
            'intellmeet_user',
            JSON.stringify(response.data.data.user)
          );
        }
      } catch {
        // If session verification fails, clear storage
        setUser(null);
        setToken(null);
        localStorage.removeItem('intellmeet_token');
        localStorage.removeItem('intellmeet_refresh_token');
        localStorage.removeItem('intellmeet_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { user: loggedInUser, accessToken, refreshToken } = response.data.data;

    setUser(loggedInUser);
    setToken(accessToken);
    localStorage.setItem('intellmeet_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('intellmeet_refresh_token', refreshToken);
    }
    localStorage.setItem('intellmeet_user', JSON.stringify(loggedInUser));
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    const { user: registeredUser, accessToken, refreshToken } = response.data.data;

    setUser(registeredUser);
    setToken(accessToken);
    localStorage.setItem('intellmeet_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('intellmeet_refresh_token', refreshToken);
    }
    localStorage.setItem('intellmeet_user', JSON.stringify(registeredUser));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('intellmeet_token');
      localStorage.removeItem('intellmeet_refresh_token');
      localStorage.removeItem('intellmeet_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
