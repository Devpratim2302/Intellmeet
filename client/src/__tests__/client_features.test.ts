import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mediaService } from '../services/media.service';
import { taskApi } from '../services/task.api';
import { notificationApi } from '../services/notification.api';
import { meetingApi } from '../services/meeting.api';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('Client Services & API Client Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MediaService', () => {
    it('should safely handle null media stream cleanup', () => {
      expect(() => mediaService.stopMediaStream(null)).not.toThrow();
    });

    it('should stop all tracks and invoke custom cleanup function on stream', () => {
      const mockTrack1 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const mockTrack2 = { stop: vi.fn() } as unknown as MediaStreamTrack;
      const cleanupMock = vi.fn();

      const mockStream = {
        getTracks: () => [mockTrack1, mockTrack2],
        _cleanup: cleanupMock,
      } as unknown as MediaStream;

      mediaService.stopMediaStream(mockStream);

      expect(mockTrack1.stop).toHaveBeenCalledTimes(1);
      expect(mockTrack2.stop).toHaveBeenCalledTimes(1);
      expect(cleanupMock).toHaveBeenCalledTimes(1);
    });

    it('should replace video tracks across active peer connections', () => {
      const replaceTrackMock = vi.fn().mockResolvedValue(undefined);
      const mockSender = {
        track: { kind: 'video' },
        replaceTrack: replaceTrackMock,
      };
      const mockPC = {
        getSenders: () => [mockSender],
      } as unknown as RTCPeerConnection;

      const peerMap = new Map<string, RTCPeerConnection>();
      peerMap.set('peer-1', mockPC);

      const newTrack = { kind: 'video', id: 'new-v-1' } as unknown as MediaStreamTrack;
      mediaService.replaceVideoTrack(peerMap, newTrack);

      expect(replaceTrackMock).toHaveBeenCalledWith(newTrack);
    });
  });

  describe('Task API', () => {
    it('should fetch tasks with workspace filter parameters', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo', priority: 'medium' },
        { id: '2', title: 'Task 2', status: 'completed', priority: 'high' },
      ];

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: { tasks: mockTasks } },
      });

      const result = await taskApi.getTasks({ workspaceId: 'ws-123' });
      expect(api.get).toHaveBeenCalledWith('/tasks', {
        params: { workspaceId: 'ws-123' },
      });
      expect(result).toEqual(mockTasks);
    });

    it('should fetch a single task by ID', async () => {
      const mockTask = { id: 'task-99', title: 'Single Task', status: 'in_progress' };

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: { task: mockTask } },
      });

      const result = await taskApi.getTask('task-99');
      expect(api.get).toHaveBeenCalledWith('/tasks/task-99');
      expect(result).toEqual(mockTask);
    });

    it('should create a task with payload', async () => {
      const payload = {
        title: 'New Feature Task',
        status: 'todo' as const,
        priority: 'high' as const,
      };

      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { task: { id: 'task-101', ...payload } } },
      });

      const result = await taskApi.createTask(payload);
      expect(api.post).toHaveBeenCalledWith('/tasks', payload);
      expect(result.id).toBe('task-101');
    });

    it('should convert an action item to a task', async () => {
      const convertPayload = {
        actionItemId: 'action-item-77',
        priority: 'high' as const,
      };

      (api.post as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            task: { id: 'task-converted', title: 'Action Item Task' },
            isNew: true,
          },
        },
      });

      const result = await taskApi.convertActionItem(convertPayload);
      expect(api.post).toHaveBeenCalledWith(
        '/tasks/convert-action-item',
        convertPayload
      );
      expect(result.task.id).toBe('task-converted');
      expect(result.isNew).toBe(true);
    });
  });

  describe('Notification API', () => {
    it('should fetch notifications with query limit and unread filter', async () => {
      const mockNotificationResponse = {
        notifications: [{ id: 'notif-1', title: 'Task Assigned', read: false } as any],
        unreadCount: 1,
        count: 1,
      };

      (api.get as any).mockResolvedValueOnce({
        data: { success: true, data: mockNotificationResponse },
      });

      const res = await notificationApi.getNotifications({ limit: 10, unreadOnly: true });
      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: { limit: 10, unreadOnly: true },
      });
      expect(res).toEqual(mockNotificationResponse);
    });

    it('should mark a notification as read', async () => {
      (api.patch as any).mockResolvedValueOnce({
        data: { success: true, data: { notification: { id: 'notif-1', read: true } } },
      });

      const updated = await notificationApi.markAsRead('notif-1');
      expect(api.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(updated.read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      (api.patch as any).mockResolvedValueOnce({
        data: { success: true, data: { updatedCount: 4 } },
      });

      const count = await notificationApi.markAllAsRead();
      expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
      expect(count).toBe(4);
    });
  });

  describe('Meeting API', () => {
    it('should create a meeting with payload', async () => {
      const payload = { title: 'Design Review Sprint' };
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, data: { meeting: { id: 'm-1', roomId: 'room-1', title: 'Design Review Sprint' } } },
      });

      const created = await meetingApi.createMeeting(payload);
      expect(api.post).toHaveBeenCalledWith('/meetings', payload);
      expect(created.roomId).toBe('room-1');
    });

    it('should update meeting status (e.g. mark completed)', async () => {
      (api.patch as any).mockResolvedValueOnce({
        data: { success: true, data: { meeting: { roomId: 'test-room', status: 'completed' } } },
      });

      const updated = await meetingApi.updateMeeting('test-room', { status: 'completed' });
      expect(api.patch).toHaveBeenCalledWith('/meetings/test-room', { status: 'completed' });
      expect(updated.status).toBe('completed');
    });
  });
});
