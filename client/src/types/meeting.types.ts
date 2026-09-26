import { User } from './auth.types';

export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  host: User;
  participants: User[];
  roomId: string;
  status: MeetingStatus;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joinedAt: string;
}

export interface SignalingLog {
  id: string;
  timestamp: string;
  type: 'offer' | 'answer' | 'ice' | 'join' | 'leave' | 'info';
  message: string;
  peerId?: string;
}
