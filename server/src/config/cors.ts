import { CorsOptions } from 'cors';
import { config } from './env.js';

/**
 * Normalizes an origin string by trimming whitespace and removing trailing slashes.
 */
export const normalizeOrigin = (origin: string): string => {
  return origin.trim().replace(/\/+$/, '');
};

/**
 * Extracts and normalizes all approved origins from environment configuration.
 * Supports comma-separated origin strings (e.g. "https://app1.vercel.app,https://app2.vercel.app").
 */
export const getAllowedOrigins = (): string[] => {
  const configured = config.clientUrl;
  const origins = new Set<string>();

  if (configured) {
    configured
      .split(',')
      .map((item) => normalizeOrigin(item))
      .filter((item) => item.length > 0)
      .forEach((origin) => origins.add(origin));
  }

  // In non-production environments (development & test), permit standard local dev origins
  if (config.nodeEnv !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
    origins.add('http://localhost:3000');
  }

  return Array.from(origins);
};

/**
 * Checks whether an incoming request origin is allowed.
 * Requests without an Origin header (e.g. server-to-server, health-checks, curl, mobile apps)
 * are permitted to proceed.
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  // Explicit secure policy: permit project deployments on Vercel and Render over HTTPS
  if (/^https:\/\/[a-zA-Z0-9-_]+\.vercel\.app$/.test(normalized)) {
    return true;
  }
  if (/^https:\/\/[a-zA-Z0-9-_]+\.onrender\.com$/.test(normalized)) {
    return true;
  }

  return false;
};

/**
 * Shared CORS configuration options for Express HTTP middleware and Socket.io signaling.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
