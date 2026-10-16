import { CookieOptions, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';
import { User } from '../models/user.model.js';
import { cloudinaryStorage } from '../services/storage/cloudinary.service.js';

// Environment-aware cookie options for secure token delivery
export const getAuthCookieOptions = (maxAgeMs?: number): CookieOptions => {
  const isProduction = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-origin Vercel -> Render HTTPS requests require SameSite=None with Secure=true
    // Local development on HTTP localhost uses SameSite=Lax
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
    ...(typeof maxAgeMs === 'number' && maxAgeMs > 0 ? { maxAge: maxAgeMs } : {}),
  };
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.register(req.body);

    res.cookie(
      'refreshToken',
      result.refreshToken,
      getAuthCookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
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
    const result = await authService.login(req.body);

    res.cookie(
      'refreshToken',
      result.refreshToken,
      getAuthCookieOptions(7 * 24 * 60 * 60 * 1000)
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
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

    const newAccessToken = await authService.refreshToken(incomingRefreshToken);

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

    const profile = await authService.getProfile(req.user);

    res.status(200).json({
      success: true,
      data: {
        user: profile,
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
      await authService.logout(req.user._id.toString());
    }

    const clearOptions = getAuthCookieOptions();
    res.clearCookie('refreshToken', clearOptions);
    res.clearCookie('accessToken', clearOptions);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      const error: any = new Error('Authentication required.');
      error.statusCode = 401;
      throw error;
    }

    if (!req.file) {
      const error: any = new Error('No image file provided for avatar upload.');
      error.statusCode = 400;
      throw error;
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) {
      const error: any = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Delete obsolete avatar from Cloudinary if previously stored
    if (user.avatarPublicId) {
      await cloudinaryStorage.deleteAsset(user.avatarPublicId);
    }

    // Upload new avatar buffer
    const { url, publicId } = await cloudinaryStorage.uploadAvatar(
      req.file.buffer,
      req.file.mimetype,
      userId
    );

    user.avatar = url;
    user.avatarPublicId = publicId;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      const error: any = new Error('Authentication required.');
      error.statusCode = 401;
      throw error;
    }

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    if (!user) {
      const error: any = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    if (user.avatarPublicId) {
      await cloudinaryStorage.deleteAsset(user.avatarPublicId);
    }

    user.avatar = '';
    user.avatarPublicId = '';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar removed successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: '',
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

