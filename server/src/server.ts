import http from 'http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { config } from './config/env.js';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start listening
    server.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🚀 IntellMeet Server running in ${config.nodeEnv} mode`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🛡️  Health: http://localhost:${config.port}/api/health`);
      console.log(`===============================================`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDB();
        console.log('[Server] Graceful shutdown completed.');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error('[Server] Forced exit due to timeout during shutdown.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Startup error:', error);
    process.exit(1);
  }
};

startServer();
