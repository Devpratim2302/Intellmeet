import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import taskRoutes from './routes/task.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/error.middleware.js';

export const createApp = (): Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Body parsers & cookies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // General API Rate Limiting for security against DoS & brute force
  app.use('/api', apiLimiter);

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'intellmeet-api',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/notifications', notificationRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
