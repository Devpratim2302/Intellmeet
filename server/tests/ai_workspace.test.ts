import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import http from 'http';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/sockets/index.js';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { Transcript } from '../src/models/transcript.model.js';
import { Summary } from '../src/models/summary.model.js';
import { ActionItem } from '../src/models/action-item.model.js';
import { Workspace } from '../src/models/workspace.model.js';
import { meetingAIResponseSchema } from '../src/validators/ai-analysis.validator.js';
import { meetingAnalysisService } from '../src/services/ai/meeting-analysis.service.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

let httpServer: http.Server;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  httpServer = http.createServer(app);
  const io = initSocketServer(httpServer);
  app.set('io', io);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
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
  await Transcript.deleteMany({});
  await Summary.deleteMany({});
  await ActionItem.deleteMany({});
  await Workspace.deleteMany({});
});

describe('Development Block 6: AI Meeting Summary, Action Items & Workspaces', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let user3Token: string;
  let user3Id: string;
  let meetingId: string;
  let roomId: string;

  beforeEach(async () => {
    // 1. Create User 1 (Alice - Team Lead)
    const u1Res = await request(app).post('/api/auth/register').send({
      name: 'Alice Lead',
      email: 'alice@intellmeet.io',
      password: 'Password123!',
    });
    user1Token = u1Res.body.data.accessToken;
    user1Id = u1Res.body.data.user.id;

    // 2. Create User 2 (Bob - Engineer)
    const u2Res = await request(app).post('/api/auth/register').send({
      name: 'Bob Engineer',
      email: 'bob@intellmeet.io',
      password: 'Password123!',
    });
    user2Token = u2Res.body.data.accessToken;
    user2Id = u2Res.body.data.user.id;

    // 3. Create User 3 (Charlie - External / Other)
    const u3Res = await request(app).post('/api/auth/register').send({
      name: 'Charlie External',
      email: 'charlie@intellmeet.io',
      password: 'Password123!',
    });
    user3Token = u3Res.body.data.accessToken;
    user3Id = u3Res.body.data.user.id;

    // 4. Create Meeting
    const meetingRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Q4 Product Roadmap & Audio AI Release',
        description: 'Discussing speech pipeline, action items, and team workspaces',
      });
    meetingId = meetingRes.body.data.meeting.id;
    roomId = meetingRes.body.data.meeting.roomId;

    // 5. Seed realistic meeting transcript with speaker dialogue, commitments, and decisions
    const transcript = new Transcript({
      meeting: new mongoose.Types.ObjectId(meetingId),
      roomId,
      status: 'completed',
      language: 'en-US',
      provider: 'mock',
      fullText: [
        '[10:00 AM] Alice Lead: Welcome everyone. Today we must decide on the AI transcription provider and assign the remaining tasks.',
        '[10:02 AM] Bob Engineer: I reviewed Deepgram and OpenAI Whisper. We concluded and agreed that OpenAI Whisper will be chosen for production speech recognition.',
        '[10:05 AM] Bob Engineer: I will deploy the new WebRTC audio recording pipeline by tomorrow.',
        '[10:08 AM] Alice Lead: Great. We will also prepare the workspace foundation tests by Friday. Please review the security policies as well.',
      ].join('\n'),
      segments: [
        {
          speaker: { id: new mongoose.Types.ObjectId(user1Id), name: 'Alice Lead', email: 'alice@intellmeet.io' },
          text: 'Welcome everyone. Today we must decide on the AI transcription provider and assign the remaining tasks.',
          timestamp: new Date('2026-10-08T10:00:00Z'),
        },
        {
          speaker: { id: new mongoose.Types.ObjectId(user2Id), name: 'Bob Engineer', email: 'bob@intellmeet.io' },
          text: 'I reviewed Deepgram and OpenAI Whisper. We concluded and agreed that OpenAI Whisper will be chosen for production speech recognition.',
          timestamp: new Date('2026-10-08T10:02:00Z'),
        },
        {
          speaker: { id: new mongoose.Types.ObjectId(user2Id), name: 'Bob Engineer', email: 'bob@intellmeet.io' },
          text: 'I will deploy the new WebRTC audio recording pipeline by tomorrow.',
          timestamp: new Date('2026-10-08T10:05:00Z'),
        },
        {
          speaker: { id: new mongoose.Types.ObjectId(user1Id), name: 'Alice Lead', email: 'alice@intellmeet.io' },
          text: 'Great. We will also prepare the workspace foundation tests by Friday. Please review the security policies as well.',
          timestamp: new Date('2026-10-08T10:08:00Z'),
        },
      ],
    });
    await transcript.save();
  });

  describe('1. AI Response Validation (Never Blindly Trust AI JSON)', () => {
    it('should validate conforming structured AI output', () => {
      const validPayload = {
        overview: 'This is a valid concise summary of the team meeting objectives and deliverables.',
        keyPoints: ['Reviewed speech recognition engine', 'Discussed deployment timelines'],
        decisions: ['Selected OpenAI Whisper for speech recognition'],
        topics: ['Speech AI', 'WebRTC'],
        actionItems: [
          {
            title: 'Deploy WebRTC audio recording pipeline',
            description: 'Production setup',
            assigneeName: 'Bob Engineer',
            dueDate: '2026-10-09',
            priority: 'high',
            sourceSnippet: 'I will deploy the new WebRTC audio recording pipeline by tomorrow.',
          },
        ],
      };

      const result = meetingAIResponseSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overview).toBe(validPayload.overview);
        expect(result.data.actionItems).toHaveLength(1);
        expect(result.data.actionItems[0].priority).toBe('high');
      }
    });

    it('should reject malformed AI payloads missing required overview or keyPoints', () => {
      const invalidPayload = {
        overview: 'Too short', // requires >= 10 chars
        keyPoints: [], // requires at least 1 key point
        actionItems: [],
      };

      const result = meetingAIResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject AI action item with invalid priority', () => {
      const invalidItem = {
        overview: 'This is a valid meeting summary overview text.',
        keyPoints: ['Key discussion item'],
        actionItems: [
          {
            title: 'Valid task title',
            priority: 'super-critical', // invalid enum
          },
        ],
      };

      const result = meetingAIResponseSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('2. Transcript Processing & Summary Storage', () => {
    it('POST /api/meetings/:id/summary/generate - should process transcript and generate grounded summary & action items', async () => {
      const res = await request(app)
        .post(`/api/meetings/${roomId}/summary/generate`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();

      const { summary, actionItems } = res.body.data;

      // Summary checks
      expect(summary.overview).toBeDefined();
      expect(summary.overview.length).toBeGreaterThan(20);
      expect(summary.keyPoints.length).toBeGreaterThan(0);
      expect(summary.decisions.length).toBeGreaterThan(0);
      expect(summary.decisions.some((d: string) => d.includes('OpenAI Whisper'))).toBe(true);
      expect(summary.topics).toContain('Speech AI');

      // Verify persistence in MongoDB
      const dbSummary = await Summary.findOne({ roomId: roomId.toLowerCase() });
      expect(dbSummary).toBeDefined();
      expect(dbSummary!.overview).toBe(summary.overview);
      expect(dbSummary!.keyPoints.length).toBe(summary.keyPoints.length);

      // Action items checks
      expect(actionItems.length).toBeGreaterThan(0);
      const bobTask = actionItems.find((i: any) => i.assigneeName === 'Bob Engineer');
      expect(bobTask).toBeDefined();
      expect(bobTask.title).toContain('Deploy');
      expect(bobTask.assignee).toBe(user2Id); // Correctly matched to registered User 2!
      expect(bobTask.status).toBe('pending');
      expect(bobTask.dueDate).toBeDefined();
    });

    it('GET /api/meetings/:id/summary - should retrieve existing meeting summary', async () => {
      // First generate
      await request(app)
        .post(`/api/meetings/${roomId}/summary/generate`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();

      // Then retrieve
      const res = await request(app)
        .get(`/api/meetings/${roomId}/summary`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.overview).toBeDefined();
    });

    it('should reject summary generation if meeting transcript is empty', async () => {
      // Create empty meeting
      const emptyMeeting = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Empty Meeting without Audio' });
      const emptyRoomId = emptyMeeting.body.data.meeting.roomId;

      const res = await request(app)
        .post(`/api/meetings/${emptyRoomId}/summary/generate`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No transcript content is recorded');
    });
  });

  describe('3. Action Item Extraction & Task Management', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/meetings/${roomId}/summary/generate`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();
    });

    it('GET /api/meetings/:id/action-items - should return extracted action items', async () => {
      const res = await request(app)
        .get(`/api/meetings/${roomId}/action-items`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.actionItems).toBeDefined();
      expect(res.body.data.actionItems.length).toBeGreaterThan(0);
    });

    it('PATCH /api/meetings/:id/action-items/:itemId - should update status of action item', async () => {
      const getRes = await request(app)
        .get(`/api/meetings/${roomId}/action-items`)
        .set('Authorization', `Bearer ${user1Token}`);
      const item = getRes.body.data.actionItems[0];

      const patchRes = await request(app)
        .patch(`/api/meetings/${roomId}/action-items/${item.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          status: 'completed',
          priority: 'high',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.actionItem.status).toBe('completed');
      expect(patchRes.body.data.actionItem.priority).toBe('high');

      // Verify in DB
      const dbItem = await ActionItem.findById(item.id);
      expect(dbItem!.status).toBe('completed');
    });

    it('POST /api/meetings/:id/action-items - should allow adding a manual action item', async () => {
      const postRes = await request(app)
        .post(`/api/meetings/${roomId}/action-items`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Schedule retrospective with client stakeholders',
          description: 'Follow up on sprint goals',
          assigneeName: 'Alice Lead',
          priority: 'medium',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.actionItem.title).toBe(
        'Schedule retrospective with client stakeholders'
      );
    });

    it('DELETE /api/meetings/:id/action-items/:itemId - should delete an action item', async () => {
      const getRes = await request(app)
        .get(`/api/meetings/${roomId}/action-items`)
        .set('Authorization', `Bearer ${user1Token}`);
      const item = getRes.body.data.actionItems[0];

      const delRes = await request(app)
        .delete(`/api/meetings/${roomId}/action-items/${item.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const check = await ActionItem.findById(item.id);
      expect(check).toBeNull();
    });
  });

  describe('4. Team Workspace Foundation & Authorization', () => {
    let workspaceId: string;

    it('POST /api/workspaces - should create workspace with creator as owner', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Core Engineering Team',
          description: 'Main product development team workspace',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workspace.name).toBe('Core Engineering Team');
      expect(res.body.data.workspace.slug).toContain('core-engineering-team');
      expect(res.body.data.workspace.owner).toBe(user1Id);
      expect(res.body.data.workspace.members).toHaveLength(1);
      expect(res.body.data.workspace.members[0].role).toBe('owner');

      workspaceId = res.body.data.workspace.id;
    });

    describe('Workspace Member Management & Permissions', () => {
      beforeEach(async () => {
        const res = await request(app)
          .post('/api/workspaces')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'DevOps & Infrastructure',
            description: 'Cloud systems and release pipelines',
          });
        workspaceId = res.body.data.workspace.id;
      });

      it('POST /api/workspaces/:id/members - Owner should be able to add member by email', async () => {
        const addRes = await request(app)
          .post(`/api/workspaces/${workspaceId}/members`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIdentifier: 'bob@intellmeet.io',
            role: 'member',
          });

        expect(addRes.status).toBe(201);
        expect(addRes.body.success).toBe(true);
        expect(addRes.body.data.workspace.members).toHaveLength(2);
      });

      it('PATCH /api/workspaces/:id/members/:userId - Owner should be able to promote member to admin', async () => {
        // Add Bob first
        await request(app)
          .post(`/api/workspaces/${workspaceId}/members`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIdentifier: 'bob@intellmeet.io',
            role: 'member',
          });

        // Promote Bob to admin
        const updateRes = await request(app)
          .patch(`/api/workspaces/${workspaceId}/members/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ role: 'admin' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.success).toBe(true);

        const bobMember = updateRes.body.data.workspace.members.find(
          (m: any) => m.user.id === user2Id || m.user._id === user2Id
        );
        expect(bobMember.role).toBe('admin');
      });

      it('should prevent non-members from accessing workspace (403 Forbidden)', async () => {
        // User 3 (Charlie) is not a member of this workspace
        const res = await request(app)
          .get(`/api/workspaces/${workspaceId}`)
          .set('Authorization', `Bearer ${user3Token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Access denied');
      });

      it('should prevent regular members from adding other members (403 Forbidden)', async () => {
        // Add Bob as regular member
        await request(app)
          .post(`/api/workspaces/${workspaceId}/members`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIdentifier: 'bob@intellmeet.io',
            role: 'member',
          });

        // Bob tries to add Charlie -> must be rejected
        const res = await request(app)
          .post(`/api/workspaces/${workspaceId}/members`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            userIdentifier: 'charlie@intellmeet.io',
            role: 'member',
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Permission denied');
      });

      it('should prevent non-owners from deleting workspace (403 Forbidden)', async () => {
        // Bob tries to delete workspace owned by Alice
        const res = await request(app)
          .delete(`/api/workspaces/${workspaceId}`)
          .set('Authorization', `Bearer ${user2Token}`);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });

      it('DELETE /api/workspaces/:id/members/:userId - Owner should be able to remove a member', async () => {
        // Add Bob
        await request(app)
          .post(`/api/workspaces/${workspaceId}/members`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIdentifier: 'bob@intellmeet.io',
            role: 'member',
          });

        // Remove Bob
        const removeRes = await request(app)
          .delete(`/api/workspaces/${workspaceId}/members/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`);

        expect(removeRes.status).toBe(200);
        expect(removeRes.body.success).toBe(true);
        expect(removeRes.body.data.workspace.members).toHaveLength(1);
      });

      it('DELETE /api/workspaces/:id - Owner should successfully delete workspace', async () => {
        const delRes = await request(app)
          .delete(`/api/workspaces/${workspaceId}`)
          .set('Authorization', `Bearer ${user1Token}`);

        expect(delRes.status).toBe(200);
        expect(delRes.body.success).toBe(true);

        const check = await Workspace.findById(workspaceId);
        expect(check).toBeNull();
      });
    });
  });
});
