import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import { config } from '../config/env.js';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const initRedisAdapter = async (io: Server): Promise<boolean> => {
  if (!config.redis.enabled) {
    console.log('[Socket Redis] Redis adapter disabled or not configured. Using default in-memory adapter.');
    return false;
  }

  const redisUri = config.redis.uri;
  console.log(`[Socket Redis] Initializing Redis pub/sub adapter at ${redisUri}...`);

  try {
    pubClient = new Redis(redisUri, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('[Socket Redis] Max reconnection attempts reached for Redis.');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('[Socket Redis] Pub client error:', err.message);
    });

    subClient.on('error', (err) => {
      console.error('[Socket Redis] Sub client error:', err.message);
    });

    pubClient.on('connect', () => {
      console.log('[Socket Redis] Pub client connected successfully.');
    });

    subClient.on('connect', () => {
      console.log('[Socket Redis] Sub client connected successfully.');
    });

    // Verify connectivity with ping
    await Promise.all([pubClient.ping(), subClient.ping()]);

    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket Redis] Successfully attached Redis adapter to Socket.io for horizontal scaling.');
    return true;
  } catch (error: any) {
    console.error('[Socket Redis] Failed to initialize Redis adapter:', error.message);
    if (config.nodeEnv === 'production') {
      throw new Error(
        `[FATAL CONFIG ERROR] Failed to connect to Redis for Socket.io adapter in production: ${error.message}`
      );
    }
    console.warn('[Socket Redis] Continuing with default in-memory adapter for non-production environment.');
    return false;
  }
};

export const closeRedisAdapter = async (): Promise<void> => {
  try {
    const promises: Promise<any>[] = [];
    if (pubClient) {
      promises.push(pubClient.quit());
    }
    if (subClient) {
      promises.push(subClient.quit());
    }
    await Promise.all(promises);
    console.log('[Socket Redis] Redis pub/sub clients closed cleanly.');
  } catch (err: any) {
    console.error('[Socket Redis] Error closing Redis clients:', err.message);
  } finally {
    pubClient = null;
    subClient = null;
  }
};
