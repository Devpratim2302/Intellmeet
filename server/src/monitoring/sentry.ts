import * as Sentry from '@sentry/node';
import { Application, Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

let isSentryInitialized = false;

/**
 * Initialize Sentry error tracking if SENTRY_DSN is configured
 */
export const initSentry = (app?: Application): void => {
  const dsn = config.sentry.dsn?.trim();

  if (!dsn) {
    if (config.nodeEnv !== 'test') {
      console.log('ℹ️  [Sentry] SENTRY_DSN not configured. Sentry monitoring is disabled (safe fallback).');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: config.sentry.environment,
      tracesSampleRate: config.nodeEnv === 'production' ? 0.2 : 1.0,
      integrations: [],
    });

    isSentryInitialized = true;
    console.log(`🛡️  [Sentry] Initialized error monitoring for environment: ${config.sentry.environment}`);
  } catch (error) {
    console.error('⚠️  [Sentry] Failed to initialize Sentry:', error);
  }
};

/**
 * Express error handler middleware for Sentry
 * Captures exceptions to Sentry while passing through to the application error handler
 */
export const sentryErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (isSentryInitialized) {
    Sentry.captureException(err);
  }
  next(err);
};

export const captureError = (error: Error | unknown, context?: Record<string, any>): void => {
  if (isSentryInitialized) {
    Sentry.captureException(error, { extra: context });
  }
};
