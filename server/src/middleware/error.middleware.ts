import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: number | string;
  errors?: any;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Please use another value.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found or invalid identifier format.';
  }

  console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode}: ${message}`);
  if (config.nodeEnv === 'development' && statusCode === 500) {
    console.error(err.stack);
  }

  // Prevent leaking internal system error messages to clients in production
  if (config.nodeEnv === 'production' && statusCode === 500) {
    message = 'An unexpected internal server error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
