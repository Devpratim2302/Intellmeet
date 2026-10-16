import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const getJwtSecret = (
  envVarName: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
  devFallback: string
): string => {
  const secret = process.env[envVarName]?.trim();

  if (isProduction) {
    if (!secret) {
      throw new Error(
        `[FATAL CONFIG ERROR] ${envVarName} must be provided in production environment (NODE_ENV=production). Refusing to start without a valid secret.`
      );
    }
    return secret;
  }

  // Development/test environment fallback when not explicitly supplied
  return secret || devFallback;
};

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv,
  mongoUri: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_dev')
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .trim(),
  jwt: {
    accessSecret: getJwtSecret('JWT_ACCESS_SECRET', 'intellmeet_access_dev_fallback_secret_key_only'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: getJwtSecret('JWT_REFRESH_SECRET', 'intellmeet_refresh_dev_fallback_secret_key_only'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  transcription: {
    provider: (process.env.TRANSCRIPTION_PROVIDER || 'mock').toLowerCase(),
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
    maxUploadSizeBytes: parseInt(process.env.MAX_AUDIO_UPLOAD_SIZE_MB || '25', 10) * 1024 * 1024,
  },
  ai: {
    provider: (process.env.AI_PROVIDER || 'mock').toLowerCase(),
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true' || !!process.env.REDIS_URI || !!process.env.REDIS_HOST,
    uri: process.env.REDIS_URI || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}` : 'redis://localhost:6379'),
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: nodeEnv,
    enabled: !!process.env.SENTRY_DSN,
  },
  metrics: {
    enabled: process.env.PROMETHEUS_METRICS_ENABLED !== 'false',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    maxImageUploadSizeBytes: parseInt(process.env.MAX_IMAGE_UPLOAD_SIZE_MB || '5', 10) * 1024 * 1024,
  },
};
