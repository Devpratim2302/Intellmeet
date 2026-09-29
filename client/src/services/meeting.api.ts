import { api } from './api';
import { Meeting, ChatMessage } from '../types/meeting.types';

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

export interface UpdateMeetingPayload {
  title?: string;
  description?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export const meetingApi = {
  async getMeetings(): Promise<Meeting[]> {
    const res = await api.get('/meetings');
    return res.data.data.meetings;
  },

  async getMeeting(idOrRoomId: string): Promise<Meeting> {
    const res = await api.get(`/meetings/${idOrRoomId}`);
    return res.data.data.meeting;
  },

  async createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
    const res = await api.post('/meetings', payload);
    return res.data.data.meeting;
  },

  async updateMeeting(
    idOrRoomId: string,
    payload: UpdateMeetingPayload
  ): Promise<Meeting> {
    const res = await api.patch(`/meetings/${idOrRoomId}`, payload);
    return res.data.data.meeting;
  },

  async deleteMeeting(idOrRoomId: string): Promise<void> {
    await api.delete(`/meetings/${idOrRoomId}`);
  },

  async getMeetingMessages(idOrRoomId: string): Promise<ChatMessage[]> {
    const res = await api.get(`/meetings/${idOrRoomId}/messages`);
    return res.data.data.messages;
  },

  async sendMeetingMessage(idOrRoomId: string, content: string): Promise<ChatMessage> {
    const res = await api.post(`/meetings/${idOrRoomId}/messages`, { content });
    return res.data.data.message;
  },
};

