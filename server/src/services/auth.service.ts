import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/token.js';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Registers a new user account
   */
  async register(data: RegisterDTO): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      const error: any = new Error('A user with this email address already exists');
      error.statusCode = 409;
      throw error;
    }

    const user = new User({
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'user',
    });

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates user credentials and issues tokens
   */
  async login(data: LoginDTO): Promise<AuthResult> {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select(
      '+password +refreshToken'
    );
    if (!user) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validates refresh token and issues new access token
   */
  async refreshToken(incomingRefreshToken: string): Promise<string> {
    let decoded: TokenPayload;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch {
      const error: any = new Error('Invalid or expired refresh token. Please log in again.');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.refreshToken) {
      const error: any = new Error('User session not found or revoked');
      error.statusCode = 401;
      throw error;
    }

    const isTokenValid = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!isTokenValid) {
      user.refreshToken = null;
      await user.save();
      const error: any = new Error('Refresh token invalid. Session revoked.');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return generateAccessToken(tokenPayload);
  }

  /**
   * Clears active session and token in database
   */
  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  /**
   * Fetches safe user profile
   */
  async getProfile(user: IUser) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
