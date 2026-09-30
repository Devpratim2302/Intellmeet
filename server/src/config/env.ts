import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_dev',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'intellmeet_access_super_secret_dev_key_2026',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'intellmeet_refresh_super_secret_dev_key_2026',
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
};
