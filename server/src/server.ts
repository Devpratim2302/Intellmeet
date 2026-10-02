import http from 'http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config } from './config/env.js';
import { initSocketServer } from './sockets/index.js';
import { initRedisAdapter, closeRedisAdapter } from './sockets/redis.js';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Express application & HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.io Server with WebRTC signaling
    const io = initSocketServer(server);
    app.set('io', io);

    // 4. Attach Redis adapter for horizontal scaling across multiple pods
    await initRedisAdapter(io);

    // 4. Start listening
    server.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🚀 IntellMeet Server running in ${config.nodeEnv} mode`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🛡️  Health: http://localhost:${config.port}/api/health`);
      console.log(`⚡ Socket.io: Connected & WebRTC signaling ready`);
      console.log(`===============================================`);
    });

    // Graceful shutdown handling
    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

      // Force exit after 10 seconds if graceful shutdown hangs
      const forceExitTimer = setTimeout(() => {
        console.error('[Server] Forced exit: graceful shutdown timed out after 10s.');
        process.exit(1);
      }, 10000);
      forceExitTimer.unref();

      try {
        // 1. Stop accepting new HTTP connections
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) return reject(err);
            console.log('[Server] HTTP server stopped accepting connections.');
            resolve();
          });
        });

        // 2. Disconnect Socket.io clients cleanly and close engine
        if (io) {
          console.log('[Server] Closing Socket.io server and disconnecting clients...');
          await new Promise<void>((resolve) => {
            io.close(() => {
              console.log('[Server] Socket.io server closed.');
              resolve();
            });
          });
        }

        // 3. Close Redis pub/sub adapter clients
        await closeRedisAdapter();

        // 4. Close MongoDB / Mongoose connection
        await disconnectDB();

        console.log('[Server] Graceful shutdown completed cleanly.');
        process.exit(0);
      } catch (error) {
        console.error('[Server] Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
};

startServer();
