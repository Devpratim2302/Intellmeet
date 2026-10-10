import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/env.js';
import { corsOptions } from '../config/cors.js';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { User } from '../models/user.model.js';
import {
  registerMeetingHandlers,
  handleSocketDisconnect,
} from './meeting.socket.js';
import { registerWebRTCHandlers } from './webrtc.socket.js';
import { activeSocketConnectionsGauge } from '../monitoring/metrics.js';

export interface AuthenticatedSocketUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

declare module 'socket.io' {
  interface SocketData {
    user: AuthenticatedSocketUser;
  }
}

let ioInstance: Server | null = null;

export const getSocketIO = (): Server | null => ioInstance;

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      // Token can be passed in socket.handshake.auth.token or Authorization header
      let token: string | undefined = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded: TokenPayload = verifyAccessToken(token);

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user profile to socket data
      socket.data.user = {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      };

      next();
    } catch (err: any) {
      console.warn('[Socket Auth] Authentication failed:', err.message);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket: Socket) => {
    activeSocketConnectionsGauge.inc();
    const user = socket.data.user;
    console.log(`[Socket] Client connected: ${socket.id} (${user.name})`);

    // Personal user room for targeted notifications
    socket.join(`user:${user.userId}`);

    // Register meeting room events
    registerMeetingHandlers(io, socket);

    // Register isolated WebRTC signaling events
    registerWebRTCHandlers(io, socket);

    // Clean up on disconnect
    socket.on('disconnect', () => {
      activeSocketConnectionsGauge.dec();
      console.log(`[Socket] Client disconnected: ${socket.id} (${user.name})`);
      handleSocketDisconnect(io, socket);
    });
  });

  return io;
};
