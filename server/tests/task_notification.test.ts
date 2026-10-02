import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Meeting } from '../src/models/meeting.model.js';
import { ActionItem } from '../src/models/action-item.model.js';
import { Task } from '../src/models/task.model.js';
import { Notification } from '../src/models/notification.model.js';

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
  await ActionItem.deleteMany({});
  await Task.deleteMany({});
  await Notification.deleteMany({});
});

describe('Task Management & Notifications API', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;
  let meetingId: string;
  let roomId: string;
  let actionItemId: string;

  beforeEach(async () => {
    // 1. Create User 1
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Alice Manager',
      email: 'alice@intellmeet.io',
      password: 'Password123!',
    });
    user1Token = res1.body.data.accessToken;
    user1Id = res1.body.data.user.id;

    // 2. Create User 2
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Bob Developer',
      email: 'bob@intellmeet.io',
      password: 'Password123!',
    });
    user2Token = res2.body.data.accessToken;
    user2Id = res2.body.data.user.id;

    // 3. Create a Meeting
    const meetRes = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Sprint Planning Meeting',
        description: 'Discuss sprint backlog and assign deliverables',
      });
    meetingId = meetRes.body.data.meeting.id;
    roomId = meetRes.body.data.meeting.roomId;

    // 4. Create an Action Item for the meeting
    const actionItem = new ActionItem({
      meeting: new mongoose.Types.ObjectId(meetingId),
      roomId,
      title: 'Implement WebRTC data channel renegotiation',
      description: 'Ensure peer connections seamlessly renegotiate upon reconnect',
      assigneeName: 'Bob Developer',
      assignee: new mongoose.Types.ObjectId(user2Id),
      priority: 'high',
      status: 'pending',
    });
    await actionItem.save();
    actionItemId = actionItem._id.toString();
  });

  describe('Task CRUD and Board Management', () => {
    it('should reject unauthenticated task creation with 401', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Unauthorized Task' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should create a task and notify the assigned user', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Design Task Board UI',
          description: 'Build a responsive 3-column Kanban board',
          status: 'todo',
          priority: 'high',
          meetingId,
          roomId,
          assigneeId: user2Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe('Design Task Board UI');
      expect(res.body.data.task.status).toBe('todo');
      expect(res.body.data.task.priority).toBe('high');
      expect(res.body.data.task.assignee.id).toBe(user2Id);

      // Verify notification was created for User 2
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.count).toBe(1);
      expect(notifRes.body.data.notifications[0].type).toBe('task_assigned');
      expect(notifRes.body.data.notifications[0].title).toBe('New Task Assigned');
      expect(notifRes.body.data.notifications[0].read).toBe(false);
    });

    it('should list tasks and support filtering by status and search', async () => {
      // Create 2 tasks
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Frontend Kanban implementation',
          status: 'todo',
          priority: 'medium',
        });

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Backend Notification WebSocket Handler',
          status: 'in_progress',
          priority: 'urgent',
        });

      // Query all tasks
      const allRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(allRes.status).toBe(200);
      expect(allRes.body.data.count).toBe(2);

      // Filter by status=in_progress
      const filteredRes = await request(app)
        .get('/api/tasks?status=in_progress')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data.count).toBe(1);
      expect(filteredRes.body.data.tasks[0].title).toContain('Backend Notification');

      // Filter by search keyword
      const searchRes = await request(app)
        .get('/api/tasks?search=kanban')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.count).toBe(1);
      expect(searchRes.body.data.tasks[0].title).toContain('Frontend Kanban');
    });

    it('should update task status and details across the board', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Implement Dark Mode Polish',
          status: 'todo',
        });

      const taskId = createRes.body.data.task.id;

      // Update status to in_progress
      const updateRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          status: 'in_progress',
          priority: 'urgent',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.task.status).toBe('in_progress');
      expect(updateRes.body.data.task.priority).toBe('urgent');

      // Update status to completed
      const completeRes = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          status: 'completed',
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.task.status).toBe('completed');
    });

    it('should delete a task', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Temporary task to delete' });

      const taskId = createRes.body.data.task.id;

      const delRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Action Item Conversion to Task', () => {
    it('should seamlessly convert a meeting action item into a trackable task', async () => {
      const res = await request(app)
        .post('/api/tasks/convert-action-item')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          actionItemId,
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isNew).toBe(true);
      expect(res.body.data.task.title).toBe('Implement WebRTC data channel renegotiation');
      expect(res.body.data.task.status).toBe('todo');
      expect(res.body.data.task.actionItem.id).toBe(actionItemId);
      expect(res.body.data.task.meeting.id).toBe(meetingId);
      expect(res.body.data.task.roomId).toBe(roomId);

      // Converting again should be idempotent and return existing task with isNew: false
      const repeatRes = await request(app)
        .post('/api/tasks/convert-action-item')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ actionItemId });

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.data.isNew).toBe(false);
      expect(repeatRes.body.data.task.id).toBe(res.body.data.task.id);
    });
  });

  describe('Notifications Management', () => {
    it('should retrieve notifications and mark them as read', async () => {
      // Generate notification via task assignment to Bob
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Review PR for Authentication',
          assigneeId: user2Id,
        });

      // Bob fetches notifications
      const getRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.unreadCount).toBe(1);
      const notifId = getRes.body.data.notifications[0].id;

      // Mark single notification as read
      const readRes = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.notification.read).toBe(true);

      // Verify unread count is now 0
      const afterRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(afterRes.body.data.unreadCount).toBe(0);
    });

    it('should mark all notifications as read in bulk', async () => {
      // Create 2 notifications directly
      await Notification.create([
        {
          recipient: new mongoose.Types.ObjectId(user2Id),
          title: 'Notif 1',
          message: 'Message 1',
          read: false,
        },
        {
          recipient: new mongoose.Types.ObjectId(user2Id),
          title: 'Notif 2',
          message: 'Message 2',
          read: false,
        },
      ]);

      const markAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(markAllRes.status).toBe(200);
      expect(markAllRes.body.data.updatedCount).toBe(2);

      const checkRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(checkRes.body.data.unreadCount).toBe(0);
    });

    it('should delete a notification', async () => {
      const notif = await Notification.create({
        recipient: new mongoose.Types.ObjectId(user2Id),
        title: 'Delete Me',
        message: 'Notification to be deleted',
      });

      const delRes = await request(app)
        .delete(`/api/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });
});
