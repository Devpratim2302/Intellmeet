import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import mongoose from 'mongoose';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer, getSocketIO } from '../src/sockets/index.js';
import { User } from '../src/models/user.model.js';
import { Workspace } from '../src/models/workspace.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { Transcript } from '../src/models/transcript.model.js';
import { Summary } from '../src/models/summary.model.js';
import { ActionItem } from '../src/models/action-item.model.js';
import { Task } from '../src/models/task.model.js';
import { Notification } from '../src/models/notification.model.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';

describe('Comprehensive End-to-End Workflow Test', () => {
  let server: http.Server;
  let socketUrl: string;
  let app: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_MONGO_URI);
    }
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Meeting.deleteMany({});
    await Transcript.deleteMany({});
    await Summary.deleteMany({});
    await ActionItem.deleteMany({});
    await Task.deleteMany({});
    await Notification.deleteMany({});

    app = createApp();
    server = http.createServer(app);
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        socketUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    const io = getSocketIO();
    if (io) {
      io.close();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('executes full workflow: Register → Login → Workspace → Meeting → Join → Audio/Video → Chat → Screen Share → End Meeting → Transcript → Summary → Action Items → Task → Dashboard → Notification', async () => {
    // ---------------------------------------------------------
    // Step 1: Register User A (Host) and User B (Participant)
    // ---------------------------------------------------------
    const registerHostRes = await request(app).post('/api/auth/register').send({
      name: 'Host User',
      email: 'host.e2e@intellmeet.io',
      password: 'Password123!',
    });
    expect(registerHostRes.status).toBe(201);
    expect(registerHostRes.body.success).toBe(true);
    const hostId = registerHostRes.body.data.user.id;

    const registerParticipantRes = await request(app).post('/api/auth/register').send({
      name: 'Dev User',
      email: 'dev.e2e@intellmeet.io',
      password: 'Password123!',
    });
    expect(registerParticipantRes.status).toBe(201);
    const participantId = registerParticipantRes.body.data.user.id;
    const participantToken = registerParticipantRes.body.data.accessToken;

    // ---------------------------------------------------------
    // Step 2: Login Host
    // ---------------------------------------------------------
    const loginHostRes = await request(app).post('/api/auth/login').send({
      email: 'host.e2e@intellmeet.io',
      password: 'Password123!',
    });
    expect(loginHostRes.status).toBe(200);
    expect(loginHostRes.body.success).toBe(true);
    const hostToken = loginHostRes.body.data.accessToken;

    // ---------------------------------------------------------
    // Step 3: Create Workspace
    // ---------------------------------------------------------
    const workspaceRes = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: 'Engineering Workspace',
        description: 'Core product team workspace',
      });
    expect(workspaceRes.status).toBe(201);
    expect(workspaceRes.body.success).toBe(true);
    const workspaceId = workspaceRes.body.data.workspace.id;

    // ---------------------------------------------------------
    // Step 4: Create Meeting associated with Workspace
    // ---------------------------------------------------------
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Q4 Architecture Review',
        description: 'Review WebRTC infrastructure and AI analysis pipeline',
        workspaceId,
      });
    expect(meetingRes.status).toBe(201);
    expect(meetingRes.body.success).toBe(true);
    const meetingId = meetingRes.body.data.meeting.id;
    const roomId = meetingRes.body.data.meeting.roomId;
    expect(roomId).toBeDefined();

    // ---------------------------------------------------------
    // Step 5: Join Meeting via Socket.io
    // ---------------------------------------------------------
    const hostSocket: ClientSocket = Client(socketUrl, {
      auth: { token: hostToken },
      transports: ['websocket'],
    });

    const participantSocket: ClientSocket = Client(socketUrl, {
      auth: { token: participantToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      hostSocket.on('connect', () => resolve());
    });

    await new Promise<void>((resolve) => {
      participantSocket.on('connect', () => resolve());
    });

    // Host joins meeting room
    const hostJoinData: any = await new Promise((resolve) => {
      hostSocket.emit(
        'join-meeting',
        { roomId, isMuted: false, isVideoOff: false },
        (res: any) => resolve(res)
      );
    });
    expect(hostJoinData.success).toBe(true);

    // Participant joins meeting room
    const participantJoinData: any = await new Promise((resolve) => {
      participantSocket.emit(
        'join-meeting',
        { roomId, isMuted: false, isVideoOff: false },
        (res: any) => resolve(res)
      );
    });
    expect(participantJoinData.success).toBe(true);

    // ---------------------------------------------------------
    // Step 6: Video/Audio State Updates
    // ---------------------------------------------------------
    await new Promise<void>((resolve) => {
      participantSocket.emit('participant-state-update', {
        roomId,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: true,
      });
      setTimeout(resolve, 100);
    });

    // ---------------------------------------------------------
    // Step 7: Chat in Meeting
    // ---------------------------------------------------------
    const chatMsgData: any = await new Promise((resolve) => {
      participantSocket.emit(
        'chat-message',
        {
          roomId,
          content: 'Hello team, WebRTC peer connection established!',
        },
        (res: any) => resolve(res)
      );
    });
    expect(chatMsgData.success).toBe(true);
    expect(chatMsgData.data.content).toBe(
      'Hello team, WebRTC peer connection established!'
    );

    // ---------------------------------------------------------
    // Step 8: Screen Share Toggle
    // ---------------------------------------------------------
    const screenShareRes: any = await new Promise((resolve) => {
      hostSocket.emit(
        'screen-share-toggle',
        { roomId, isSharing: true },
        (res: any) => resolve(res)
      );
    });
    expect(screenShareRes.success).toBe(true);

    // ---------------------------------------------------------
    // Step 9: Transcript Generation (Direct Speech Segment)
    // ---------------------------------------------------------
    const transcriptRes1: any = await new Promise((resolve) => {
      hostSocket.emit(
        'add-transcript-segment',
        {
          roomId,
          text: 'Welcome team. We need to deploy the production Kubernetes cluster by Friday. Alice will lead the migration.',
          startTime: 0,
          endTime: 8,
          confidence: 0.98,
        },
        (res: any) => resolve(res)
      );
    });
    expect(transcriptRes1.success).toBe(true);

    const transcriptRes2: any = await new Promise((resolve) => {
      participantSocket.emit(
        'add-transcript-segment',
        {
          roomId,
          text: 'I agree. Bob will finalize the automated security audits and configure the notification webhooks.',
          startTime: 9,
          endTime: 16,
          confidence: 0.96,
        },
        (res: any) => resolve(res)
      );
    });
    expect(transcriptRes2.success).toBe(true);

    // Disconnect sockets cleanly
    hostSocket.disconnect();
    participantSocket.disconnect();

    // ---------------------------------------------------------
    // Step 10: End Meeting
    // ---------------------------------------------------------
    const endMeetingRes = await request(app)
      .patch(`/api/meetings/${roomId}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ status: 'completed' });

    expect(endMeetingRes.status).toBe(200);
    expect(endMeetingRes.body.data.meeting.status).toBe('completed');

    // ---------------------------------------------------------
    // Step 11: Transcript Retrieval
    // ---------------------------------------------------------
    const getTranscriptRes = await request(app)
      .get(`/api/meetings/${roomId}/transcript`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(getTranscriptRes.status).toBe(200);
    expect(getTranscriptRes.body.data.segments.length).toBe(2);

    // ---------------------------------------------------------
    // Step 12: Summary & Action Items Generation
    // ---------------------------------------------------------
    const generateSummaryRes = await request(app)
      .post(`/api/meetings/${roomId}/summary/generate`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ workspaceId });

    expect(generateSummaryRes.status).toBe(201);
    expect(generateSummaryRes.body.success).toBe(true);
    expect(generateSummaryRes.body.data.summary.overview).toBeDefined();
    expect(generateSummaryRes.body.data.summary.keyPoints.length).toBeGreaterThan(0);
    expect(generateSummaryRes.body.data.actionItems.length).toBeGreaterThan(0);

    const generatedActionItems = generateSummaryRes.body.data.actionItems;
    const targetActionItem = generatedActionItems[0];
    expect(targetActionItem.id).toBeDefined();

    // ---------------------------------------------------------
    // Step 13: Convert Action Item to Trackable Task
    // ---------------------------------------------------------
    const convertTaskRes = await request(app)
      .post('/api/tasks/convert-action-item')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        actionItemId: targetActionItem.id,
        assigneeId: participantId,
        priority: 'high',
      });

    expect(convertTaskRes.status).toBe(201);
    expect(convertTaskRes.body.success).toBe(true);
    expect(convertTaskRes.body.data.isNew).toBe(true);
    const createdTask = convertTaskRes.body.data.task;
    expect(createdTask.status).toBe('todo');
    expect(createdTask.actionItem.id).toBe(targetActionItem.id);

    // Update task across Kanban stages (TODO -> IN_PROGRESS -> COMPLETED)
    const updateTaskRes = await request(app)
      .patch(`/api/tasks/${createdTask.id}`)
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ status: 'in_progress' });
    expect(updateTaskRes.status).toBe(200);
    expect(updateTaskRes.body.data.task.status).toBe('in_progress');

    // ---------------------------------------------------------
    // Step 14: Post-Meeting Dashboard Data Retrieval
    // ---------------------------------------------------------
    // Check meeting metadata
    const dashboardMeeting = await request(app)
      .get(`/api/meetings/${roomId}`)
      .set('Authorization', `Bearer ${hostToken}`);
    expect(dashboardMeeting.status).toBe(200);
    expect(dashboardMeeting.body.data.meeting.status).toBe('completed');

    // Check meeting summary
    const dashboardSummary = await request(app)
      .get(`/api/meetings/${roomId}/summary`)
      .set('Authorization', `Bearer ${hostToken}`);
    expect(dashboardSummary.status).toBe(200);
    expect(dashboardSummary.body.data.summary.overview).toBeDefined();

    // Check meeting action items
    const dashboardActionItems = await request(app)
      .get(`/api/meetings/${roomId}/action-items`)
      .set('Authorization', `Bearer ${hostToken}`);
    expect(dashboardActionItems.status).toBe(200);
    expect(dashboardActionItems.body.data.actionItems.length).toBeGreaterThan(0);

    // Check meeting tasks
    const dashboardTasks = await request(app)
      .get(`/api/tasks?roomId=${roomId}`)
      .set('Authorization', `Bearer ${hostToken}`);
    expect(dashboardTasks.status).toBe(200);
    expect(dashboardTasks.body.data.count).toBeGreaterThanOrEqual(1);

    // ---------------------------------------------------------
    // Step 15: Notifications Delivery Check
    // ---------------------------------------------------------
    const participantNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${participantToken}`);

    expect(participantNotifs.status).toBe(200);
    expect(participantNotifs.body.data.count).toBeGreaterThan(0);
    const taskNotif = participantNotifs.body.data.notifications.find(
      (n: any) => n.type === 'task_assigned'
    );
    expect(taskNotif).toBeDefined();
    expect(taskNotif.read).toBe(false);
  }, 30000);
});
