import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/sockets/index.js';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { Message } from '../src/models/message.model.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

let httpServer: http.Server;
let serverPort: number;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  httpServer = http.createServer(app);
  initSocketServer(httpServer);
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address() as any;
      serverPort = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Meeting.deleteMany({});
  await Message.deleteMany({});
});

describe('Chat & Participant Presence (Development Block 4)', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let roomId: string;

  beforeEach(async () => {
    // 1. Create User 1
    const u1Res = await request(app).post('/api/auth/register').send({
      name: 'Alice Developer',
      email: 'alice@intellmeet.io',
      password: 'Password123!',
    });
    user1Token = u1Res.body.data.accessToken;
    user1Id = u1Res.body.data.user.id;

    // 2. Create User 2
    const u2Res = await request(app).post('/api/auth/register').send({
      name: 'Bob Architect',
      email: 'bob@intellmeet.io',
      password: 'Password123!',
    });
    user2Token = u2Res.body.data.accessToken;
    user2Id = u2Res.body.data.user.id;

    // 3. Create a Meeting
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Sprint 4 Planning & Review' });
    roomId = meetingRes.body.data.meeting.roomId;
  });

  describe('Chat REST API (/api/meetings/:id/messages)', () => {
    it('should reject unauthenticated message requests with 401', async () => {
      const res = await request(app).get(`/api/meetings/${roomId}/messages`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate and reject empty or whitespace message content with 400', async () => {
      const res = await request(app)
        .post(`/api/meetings/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject messages exceeding 2000 characters with 400', async () => {
      const longContent = 'A'.repeat(2001);
      const res = await request(app)
        .post(`/api/meetings/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: longContent });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should persist valid chat message and return it with sender information and timestamp', async () => {
      const postRes = await request(app)
        .post(`/api/meetings/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Hello team, welcome to Block 4!' });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.message.content).toBe('Hello team, welcome to Block 4!');
      expect(postRes.body.data.message.sender.userId).toBe(user1Id);
      expect(postRes.body.data.message.sender.name).toBe('Alice Developer');
      expect(postRes.body.data.message.createdAt).toBeDefined();

      // Retrieve messages
      const getRes = await request(app)
        .get(`/api/meetings/${roomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.count).toBe(1);
      expect(getRes.body.data.messages[0].content).toBe('Hello team, welcome to Block 4!');
    });
  });

  describe('Real-Time Chat & Presence via Socket.io', () => {
    let clientSocket1: ClientSocketType;
    let clientSocket2: ClientSocketType;

    afterEach(() => {
      if (clientSocket1?.connected) clientSocket1.disconnect();
      if (clientSocket2?.connected) clientSocket2.disconnect();
    });

    it('should synchronize participant state and deliver messages instantly across sockets', async () => {
      const socketUrl = `http://localhost:${serverPort}`;

      // Connect Client 1
      clientSocket1 = ClientSocket(socketUrl, {
        auth: { token: user1Token },
        transports: ['websocket'],
      });

      // Connect Client 2
      clientSocket2 = ClientSocket(socketUrl, {
        auth: { token: user2Token },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise<void>((resolve) => clientSocket1.on('connect', () => resolve())),
        new Promise<void>((resolve) => clientSocket2.on('connect', () => resolve())),
      ]);

      // 1. Client 1 joins room
      const join1Promise = new Promise<any>((resolve) => {
        clientSocket1.emit(
          'join-meeting',
          { roomId, isMuted: false, isVideoOff: false },
          (res: any) => resolve(res)
        );
      });
      const join1Res = await join1Promise;
      expect(join1Res.success).toBe(true);

      // Setup listener on Client 1 for when Client 2 joins
      const userJoinedOnClient1 = new Promise<any>((resolve) => {
        clientSocket1.on('user-joined', (data) => resolve(data));
      });

      // 2. Client 2 joins room
      const join2Promise = new Promise<any>((resolve) => {
        clientSocket2.emit(
          'join-meeting',
          { roomId, isMuted: true, isVideoOff: true },
          (res: any) => resolve(res)
        );
      });
      const join2Res = await join2Promise;
      expect(join2Res.success).toBe(true);

      const client2JoinNotification = await userJoinedOnClient1;
      expect(client2JoinNotification.participant.name).toBe('Bob Architect');
      expect(client2JoinNotification.participant.isMuted).toBe(true);

      // 3. Test Participant State Synchronization (Bob un-mutes and starts speaking)
      const stateUpdateOnClient1 = new Promise<any>((resolve) => {
        clientSocket1.on('participant-state-changed', (data) => resolve(data));
      });

      clientSocket2.emit('participant-state-update', {
        roomId,
        isMuted: false,
        isSpeaking: true,
      });

      const updatedState = await stateUpdateOnClient1;
      expect(updatedState.userId).toBe(user2Id);
      expect(updatedState.isMuted).toBe(false);
      expect(updatedState.isSpeaking).toBe(true);

      // 4. Test Real-time Chat Delivery
      const messageOnClient2 = new Promise<any>((resolve) => {
        clientSocket2.on('chat-message', (msg) => resolve(msg));
      });

      clientSocket1.emit(
        'chat-message',
        { roomId, content: 'Hey Bob, can you share your screen?' },
        (res: any) => {
          expect(res.success).toBe(true);
        }
      );

      const receivedMsg = await messageOnClient2;
      expect(receivedMsg.content).toBe('Hey Bob, can you share your screen?');
      expect(receivedMsg.sender.userId).toBe(user1Id);
      expect(receivedMsg.sender.name).toBe('Alice Developer');
      expect(receivedMsg.createdAt).toBeDefined();

      // Verify message was persisted to MongoDB
      const dbMessages = await Message.find({ roomId });
      expect(dbMessages.length).toBe(1);
      expect(dbMessages[0].content).toBe('Hey Bob, can you share your screen?');
    });
  });
});
