import mongoose from 'mongoose';
import { Message, IMessage } from '../models/message.model.js';
import { Meeting } from '../models/meeting.model.js';

export interface CreateMessageDTO {
  roomId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderAvatar?: string;
  content: string;
  type?: 'chat' | 'system';
}

export class MessageService {
  /**
   * Persists a new chat message for a meeting room
   */
  async createMessage(data: CreateMessageDTO): Promise<any> {
    const trimmedContent = data.content?.trim();
    if (!trimmedContent) {
      const error: any = new Error('Message content cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    if (trimmedContent.length > 2000) {
      const error: any = new Error('Message content cannot exceed 2000 characters');
      error.statusCode = 400;
      throw error;
    }

    const normalizedRoom = data.roomId.toLowerCase().trim();

    // Link meeting if meeting record exists
    let meetingId: mongoose.Types.ObjectId | undefined;
    try {
      const meeting = await Meeting.findOne({ roomId: normalizedRoom });
      if (meeting) {
        meetingId = meeting._id as mongoose.Types.ObjectId;
      }
    } catch {
      // Non-fatal if meeting lookup fails
    }

    const message = new Message({
      roomId: normalizedRoom,
      meeting: meetingId || null,
      sender: new mongoose.Types.ObjectId(data.senderId),
      senderName: data.senderName,
      senderEmail: data.senderEmail || '',
      senderAvatar: data.senderAvatar || '',
      content: trimmedContent,
      type: data.type || 'chat',
    });

    await message.save();

    return {
      id: message._id.toString(),
      roomId: message.roomId,
      meeting: message.meeting ? message.meeting.toString() : null,
      sender: {
        userId: data.senderId,
        name: data.senderName,
        email: data.senderEmail,
        avatar: data.senderAvatar,
      },
      content: message.content,
      type: message.type,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves messages for a given meeting room ordered chronologically
   */
  async getMeetingMessages(roomIdOrMeetingId: string, limit = 100): Promise<any[]> {
    let normalizedRoom = roomIdOrMeetingId.toLowerCase().trim();

    // If a mongo ObjectId was provided, find corresponding meeting's roomId
    if (mongoose.isValidObjectId(roomIdOrMeetingId)) {
      const meeting = await Meeting.findById(roomIdOrMeetingId);
      if (meeting) {
        normalizedRoom = meeting.roomId;
      }
    }

    const messages = await Message.find({ roomId: normalizedRoom })
      .sort({ createdAt: 1 })
      .limit(Math.min(limit, 200));

    return messages.map((m) => ({
      id: m._id.toString(),
      roomId: m.roomId,
      meeting: m.meeting ? m.meeting.toString() : null,
      sender: {
        userId: m.sender.toString(),
        name: m.senderName,
        email: m.senderEmail,
        avatar: m.senderAvatar,
      },
      content: m.content,
      type: m.type,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }
}

export const messageService = new MessageService();
