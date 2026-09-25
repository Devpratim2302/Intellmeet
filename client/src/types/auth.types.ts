export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'guest';
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken?: string;
  };
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
