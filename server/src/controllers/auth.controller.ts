import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { config } from '../config/env.js';

// Cookie options for security
const getCookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: maxAgeMs,
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'A user with this email address already exists',
      });
      return;
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user',
    });

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save hashed refresh token to user
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    // Set refresh token cookie (7 days)
    res.cookie(
      'refreshToken',
      refreshToken,
      getCookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user with password and refreshToken fields explicitly selected
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update stored refresh token
    user.refreshToken = await bcrypt.hash(refreshToken, 10);
    await user.save();

    res.cookie(
      'refreshToken',
      refreshToken,
      getCookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
      return;
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || !user.refreshToken) {
      res.status(401).json({
        success: false,
        message: 'User session not found or revoked',
      });
      return;
    }

    // Verify stored refresh token hash
    const isTokenValid = await bcrypt.compare(
      incomingRefreshToken,
      user.refreshToken
    );
    if (!isTokenValid) {
      // Possible token reuse attack - clear stored token
      user.refreshToken = null;
      await user.save();
      res.status(401).json({
        success: false,
        message: 'Refresh token invalid. Session revoked.',
      });
      return;
    }

    // Issue new access token
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          avatar: req.user.avatar,
          isVerified: req.user.isVerified,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user) {
      // Invalidate stored refresh token in DB
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
