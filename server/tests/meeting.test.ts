import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intellmeet_test';
const app = createApp();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Meeting.deleteMany({});
});

describe('Meeting Management API (Development Block 2)', () => {
  let hostToken: string;
  let otherUserToken: string;

  beforeEach(async () => {
    // 1. Create host user
    const hostRes = await request(app).post('/api/auth/register').send({
      name: 'Host User',
      email: 'host@intellmeet.io',
      password: 'Password123!',
    });
    hostToken = hostRes.body.data.accessToken;

    // 2. Create another user for permission testing
    const otherRes = await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: 'other@intellmeet.io',
      password: 'Password123!',
    });
    otherUserToken = otherRes.body.data.accessToken;
  });

  describe('POST /api/meetings', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .send({ title: 'Sprint Retrospective' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully create a new meeting room with unique roomId', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Sprint Retrospective',
          description: 'Review of sprint achievements',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meeting.title).toBe('Sprint Retrospective');
      expect(res.body.data.meeting.roomId).toMatch(/^meet-[a-f0-9]{4}-[a-f0-9]{4}$/);
      expect(res.body.data.meeting.status).toBe('scheduled');
      expect(res.body.data.meeting.host).toBeDefined();

      // Check DB
      const inDb = await Meeting.findOne({ roomId: res.body.data.meeting.roomId });
      expect(inDb).not.toBeNull();
      expect(inDb?.title).toBe('Sprint Retrospective');
    });

    it('should reject meeting creation with missing or short title with 400', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'A' }); // less than 2 chars

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/meetings', () => {
    it('should list meetings where the authenticated user is host or participant', async () => {
      // Create two meetings
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Sprint Planning' });

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Daily Standup' });

      const res = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.meetings).toHaveLength(2);
    });
  });

  describe('GET /api/meetings/:id', () => {
    it('should retrieve meeting details by MongoDB ID or roomId', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Architecture Review' });

      const meetingId = createRes.body.data.meeting.id;
      const roomId = createRes.body.data.meeting.roomId;

      // 1. Get by Mongo ID
      const resById = await request(app)
        .get(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(resById.status).toBe(200);
      expect(resById.body.data.meeting.title).toBe('Architecture Review');

      // 2. Get by roomId
      const resByRoom = await request(app)
        .get(`/api/meetings/${roomId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(resByRoom.status).toBe(200);
      expect(resByRoom.body.data.meeting.roomId).toBe(roomId);
    });

    it('should return 404 for non-existent meeting', async () => {
      const res = await request(app)
        .get('/api/meetings/meet-9999-9999')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/meetings/:id (Authorization)', () => {
    it('should allow host to update meeting title and status', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Draft Meeting' });

      const meetingId = createRes.body.data.meeting.id;

      const updateRes = await request(app)
        .patch(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Final Meeting',
          status: 'active',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.meeting.title).toBe('Final Meeting');
      expect(updateRes.body.data.meeting.status).toBe('active');
    });

    it('should forbid non-host user from updating meeting with 403', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Host Private Meeting' });

      const meetingId = createRes.body.data.meeting.id;

      const updateRes = await request(app)
        .patch(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${otherUserToken}`) // unauthorized user
        .send({ title: 'Hijacked Meeting' });

      expect(updateRes.status).toBe(403);
      expect(updateRes.body.success).toBe(false);
      expect(updateRes.body.message).toMatch(/unauthorized/i);
    });
  });

  describe('DELETE /api/meetings/:id (Authorization)', () => {
    it('should forbid non-host from deleting meeting with 403', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Team Meeting' });

      const meetingId = createRes.body.data.meeting.id;

      const delRes = await request(app)
        .delete(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.success).toBe(false);
    });

    it('should allow host to delete meeting with 200', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Temporary Meeting' });

      const meetingId = createRes.body.data.meeting.id;

      const delRes = await request(app)
        .delete(`/api/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const check = await Meeting.findById(meetingId);
      expect(check).toBeNull();
    });
  });
});
