import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
} from '../types/auth.types';
import { socketService } from '../services/socket.service';

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

const sanitizeUser = (u: any): User | null => {
  if (!u) return null;
  const isDemo =
    u.name === 'Project Mentor (Evaluator)' ||
    u.name?.includes('Mentor') ||
    u.name === 'Demo Admin' ||
    u.email === 'mentor.evaluator@intellmeet.io' ||
    u.email === 'demo.admin@intellmeet.io';

  return {
    ...u,
    name: isDemo ? 'Demo Admin' : u.name,
    email: isDemo ? 'demo.admin@intellmeet.io' : u.email,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('intellmeet_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeUser(parsed);
        if (sanitized && (sanitized.name !== parsed.name || sanitized.email !== parsed.email)) {
          localStorage.setItem('intellmeet_user', JSON.stringify(sanitized));
        }
        return sanitized;
      } catch {
        return null;
      }
    }
    return null;
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
          const userData = sanitizeUser(response.data.data.user);
          setUser(userData);
          if (userData) {
            localStorage.setItem('intellmeet_user', JSON.stringify(userData));
          }
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
    const { user: rawUser, accessToken, refreshToken } = response.data.data;
    const loggedInUser = sanitizeUser(rawUser);
    setUser(loggedInUser);
    setToken(accessToken);
    localStorage.setItem('intellmeet_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('intellmeet_refresh_token', refreshToken);
    }
    if (loggedInUser) {
      localStorage.setItem('intellmeet_user', JSON.stringify(loggedInUser));
    }
    socketService.connect();
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    const { user: rawUser, accessToken, refreshToken } = response.data.data;
    const registeredUser = sanitizeUser(rawUser);
    setUser(registeredUser);
    setToken(accessToken);
    localStorage.setItem('intellmeet_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('intellmeet_refresh_token', refreshToken);
    }
    if (registeredUser) {
      localStorage.setItem('intellmeet_user', JSON.stringify(registeredUser));
    }
    socketService.connect();
  };

  const loginDemo = async () => {
    try {
      const response = await api.post<AuthResponse>('/auth/demo');
      const { user: rawUser, accessToken, refreshToken } = response.data.data;
      const loggedInUser = sanitizeUser(rawUser);

      setUser(loggedInUser);
      setToken(accessToken);
      localStorage.setItem('intellmeet_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('intellmeet_refresh_token', refreshToken);
      }
      if (loggedInUser) {
        localStorage.setItem('intellmeet_user', JSON.stringify(loggedInUser));
      }
      socketService.connect();
    } catch {
      // Fallback: try regular login with demo admin credentials or register on the fly
      try {
        await login({
          email: 'demo.admin@intellmeet.io',
          password: 'DemoPassword2026!',
        });
      } catch {
        await register({
          name: 'Demo Admin',
          email: 'demo.admin@intellmeet.io',
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
      socketService.disconnect();
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
