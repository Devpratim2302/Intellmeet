import { CookieOptions, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';

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
