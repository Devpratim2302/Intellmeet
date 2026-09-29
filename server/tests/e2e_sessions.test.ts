import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Two-Browser Session End-to-End Simulation (Block 4)', () => {
  let session1Token: string;
  let session1User: any;
  let session2Token: string;
  let session2User: any;
  let roomId: string;

  it('1. Setup Session 1 (Alice) & Session 2 (Bob) user accounts', async () => {
    // Session 1: Alice
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Alice Session1',
      email: `alice_session1_${Date.now()}@intellmeet.io`,
      password: 'Password123!',
    });
    expect(res1.status).toBe(201);
    session1Token = res1.body.data.accessToken;
    session1User = res1.body.data.user;

    // Session 2: Bob
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Bob Session2',
      email: `bob_session2_${Date.now()}@intellmeet.io`,
      password: 'Password123!',
    });
    expect(res2.status).toBe(201);
    session2Token = res2.body.data.accessToken;
    session2User = res2.body.data.user;

    // Alice creates the meeting room
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${session1Token}`)
      .send({ title: 'Block 4 Two-Session E2E Meeting' });
    expect(meetingRes.status).toBe(201);
    roomId = meetingRes.body.data.meeting.roomId;
    expect(roomId).toBeDefined();
  });

  it('2. Session 1 connects, joins room, and sends initial chat message', async () => {
    const socketUrl = `http://localhost:${serverPort}`;
    const socket1: ClientSocketType = ClientSocket(socketUrl, {
      auth: { token: session1Token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => socket1.on('connect', () => resolve()));

    // Join room
    const joinRes = await new Promise<any>((resolve) => {
      socket1.emit(
        'join-meeting',
        { roomId, isMuted: false, isVideoOff: false },
        (res: any) => resolve(res)
      );
    });
    expect(joinRes.success).toBe(true);
    expect(joinRes.data.participant.name).toBe('Alice Session1');

    // Alice sends initial chat message
    const sendRes = await new Promise<any>((resolve) => {
      socket1.emit(
        'chat-message',
        { roomId, content: 'Welcome to the meeting room! Starting session.' },
        (res: any) => resolve(res)
      );
    });
    expect(sendRes.success).toBe(true);
    expect(sendRes.data.content).toBe('Welcome to the meeting room! Starting session.');
    expect(sendRes.data.sender.name).toBe('Alice Session1');
    expect(sendRes.data.createdAt).toBeDefined();

    socket1.disconnect();
  });

  it('3. Session 2 joins, loads previous messages, and receives instant chat from Session 1', async () => {
    // 3a. Verify Session 2 loads previous messages via REST API
    const historyRes = await request(app)
      .get(`/api/meetings/${roomId}/messages`)
      .set('Authorization', `Bearer ${session2Token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.count).toBe(1);
    expect(historyRes.body.data.messages[0].content).toBe(
      'Welcome to the meeting room! Starting session.'
    );
    expect(historyRes.body.data.messages[0].sender.userId).toBe(session1User.id);

    // 3b. Establish concurrent socket connections for Session 1 and Session 2
    const socketUrl = `http://localhost:${serverPort}`;
    const socket1: ClientSocketType = ClientSocket(socketUrl, {
      auth: { token: session1Token },
      transports: ['websocket'],
    });
    const socket2: ClientSocketType = ClientSocket(socketUrl, {
      auth: { token: session2Token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => socket1.on('connect', () => resolve())),
      new Promise<void>((resolve) => socket2.on('connect', () => resolve())),
    ]);

    // Session 1 joins room
    await new Promise<any>((resolve) => {
      socket1.emit(
        'join-meeting',
        { roomId, isMuted: false, isVideoOff: false },
        (res: any) => resolve(res)
      );
    });

    // Session 1 listens for Session 2 joining
    const session1GotUserJoined = new Promise<any>((resolve) => {
      socket1.on('user-joined', (data) => resolve(data));
    });

    // Session 2 joins room with mic muted
    const session2JoinRes = await new Promise<any>((resolve) => {
      socket2.emit(
        'join-meeting',
        { roomId, isMuted: true, isVideoOff: false },
        (res: any) => resolve(res)
      );
    });
    expect(session2JoinRes.success).toBe(true);

    const userJoinedPayload = await session1GotUserJoined;
    expect(userJoinedPayload.participant.name).toBe('Bob Session2');
    expect(userJoinedPayload.participant.isMuted).toBe(true);

    // 3c. Session 2 sends a message and Session 1 receives it instantly
    const session1ReceivedChat = new Promise<any>((resolve) => {
      socket1.on('chat-message', (msg) => resolve(msg));
    });

    socket2.emit('chat-message', {
      roomId,
      content: 'Hello Alice, Bob here! Ready for screen sharing.',
    });

    const receivedOnSession1 = await session1ReceivedChat;
    expect(receivedOnSession1.content).toBe('Hello Alice, Bob here! Ready for screen sharing.');
    expect(receivedOnSession1.sender.name).toBe('Bob Session2');
    expect(receivedOnSession1.sender.userId).toBe(session2User.id);
    expect(receivedOnSession1.createdAt).toBeDefined();

    // 3d. Participant Presence State Synchronization
    // Bob unmutes his microphone and starts speaking
    const session1GotPresenceUpdate = new Promise<any>((resolve) => {
      socket1.on('participant-state-changed', (data) => resolve(data));
    });

    socket2.emit('participant-state-update', {
      roomId,
      isMuted: false,
      isSpeaking: true,
    });

    const presenceUpdate = await session1GotPresenceUpdate;
    expect(presenceUpdate.userId).toBe(session2User.id);
    expect(presenceUpdate.isMuted).toBe(false);
    expect(presenceUpdate.isSpeaking).toBe(true);

    // 3e. Screen Sharing Start & Notification
    const session2GotScreenShareNotice = new Promise<any>((resolve) => {
      socket2.on('screen-share-status', (data) => resolve(data));
    });

    socket1.emit('screen-share-toggle', {
      roomId,
      isSharing: true,
    });

    const screenShareNotice = await session2GotScreenShareNotice;
    expect(screenShareNotice.userId).toBe(session1User.id);
    expect(screenShareNotice.isSharing).toBe(true);

    // 3f. Screen Sharing Stop & Switch back to camera
    const session2GotScreenShareStop = new Promise<any>((resolve) => {
      socket2.on('screen-share-status', (data) => resolve(data));
    });

    socket1.emit('screen-share-toggle', {
      roomId,
      isSharing: false,
    });

    const screenShareStop = await session2GotScreenShareStop;
    expect(screenShareStop.userId).toBe(session1User.id);
    expect(screenShareStop.isSharing).toBe(false);

    // Clean up sockets
    socket1.disconnect();
    socket2.disconnect();
  });

  it('4. Message validation rejects empty, whitespace, and oversized messages', async () => {
    // Empty message
    const emptyRes = await request(app)
      .post(`/api/meetings/${roomId}/messages`)
      .set('Authorization', `Bearer ${session1Token}`)
      .send({ content: '' });
    expect(emptyRes.status).toBe(400);

    // Whitespace only
    const whitespaceRes = await request(app)
      .post(`/api/meetings/${roomId}/messages`)
      .set('Authorization', `Bearer ${session1Token}`)
      .send({ content: '    ' });
    expect(whitespaceRes.status).toBe(400);

    // Oversized message
    const oversizedRes = await request(app)
      .post(`/api/meetings/${roomId}/messages`)
      .set('Authorization', `Bearer ${session1Token}`)
      .send({ content: 'x'.repeat(2001) });
    expect(oversizedRes.status).toBe(400);
  });

  it('5. Database persistence check', async () => {
    const allMessages = await Message.find({ roomId });
    expect(allMessages.length).toBe(2);
    expect(allMessages.some((m) => m.content.includes('Starting session'))).toBe(true);
    expect(allMessages.some((m) => m.content.includes('Bob here'))).toBe(true);
  });
});
