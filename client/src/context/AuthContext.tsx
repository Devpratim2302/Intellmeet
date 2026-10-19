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
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<User>;
  deleteAvatar: () => Promise<User>;
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

  const loginDemo = async () => {
    try {
      const response = await api.post<AuthResponse>('/auth/demo');
      const { user: loggedInUser, accessToken, refreshToken } = response.data.data;

      setUser(loggedInUser);
      setToken(accessToken);
      localStorage.setItem('intellmeet_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('intellmeet_refresh_token', refreshToken);
      }
      localStorage.setItem('intellmeet_user', JSON.stringify(loggedInUser));
    } catch {
      // Fallback: try regular login with mentor credentials or register on the fly
      try {
        await login({
          email: 'mentor.evaluator@intellmeet.io',
          password: 'DemoPassword2026!',
        });
      } catch {
        await register({
          name: 'Project Mentor (Evaluator)',
          email: 'mentor.evaluator@intellmeet.io',
          password: 'DemoPassword2026!',
        });
      }
    }
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

  const uploadAvatar = async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updatedUser: User = response.data.data.user;
    setUser(updatedUser);
    localStorage.setItem('intellmeet_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const deleteAvatar = async (): Promise<User> => {
    const response = await api.delete('/auth/avatar');
    const updatedUser: User = response.data.data.user;
    setUser(updatedUser);
    localStorage.setItem('intellmeet_user', JSON.stringify(updatedUser));
    return updatedUser;
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
        loginDemo,
        logout,
        uploadAvatar,
        deleteAvatar,
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
