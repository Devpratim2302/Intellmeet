import mongoose from 'mongoose';
import { Meeting, IMeeting } from '../models/meeting.model.js';
import { generateRoomId } from '../utils/roomId.js';
import { notificationService } from './notification.service.js';

export interface CreateMeetingDTO {
  title: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

export interface UpdateMeetingDTO {
  title?: string;
  description?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

export class MeetingService {
  /**
   * Creates a new meeting room hosted by userId
   */
  async createMeeting(userId: string, data: CreateMeetingDTO): Promise<IMeeting> {
    // Generate a unique roomId (loop safeguard in case of collisions)
    let roomId = generateRoomId();
    while (await Meeting.findOne({ roomId })) {
      roomId = generateRoomId();
    }

    const meeting = new Meeting({
      title: data.title,
      description: data.description || '',
      host: new mongoose.Types.ObjectId(userId),
      participants: [new mongoose.Types.ObjectId(userId)],
      roomId,
      status: 'scheduled',
      scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : null,
      scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime) : null,
    });

    await meeting.save();
    return meeting.populate('host', 'name email avatar role');
  }

  /**
   * Retrieves all meetings associated with a user
   */
  async getUserMeetings(userId: string): Promise<IMeeting[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Meeting.find({
      $or: [{ host: userObjectId }, { participants: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .populate('host', 'name email avatar role')
      .populate('participants', 'name email avatar role');
  }

  /**
   * Retrieves a meeting by MongoDB _id or custom roomId
   */
  async getMeeting(idOrRoomId: string): Promise<IMeeting> {
    const query: any = mongoose.isValidObjectId(idOrRoomId)
      ? { $or: [{ _id: idOrRoomId }, { roomId: idOrRoomId.toLowerCase() }] }
      : { roomId: idOrRoomId.toLowerCase() };

    const meeting = await Meeting.findOne(query)
      .populate('host', 'name email avatar role')
      .populate('participants', 'name email avatar role');

    if (!meeting) {
      const error: any = new Error('Meeting not found');
      error.statusCode = 404;
      throw error;
    }

    return meeting;
  }

  /**
   * Updates meeting details (Authorized for host only)
   */
  async updateMeeting(
    idOrRoomId: string,
    userId: string,
    data: UpdateMeetingDTO
  ): Promise<IMeeting> {
    const meeting = await this.getMeeting(idOrRoomId);

    // Authorization check: Only host can update meeting
    if (meeting.host._id ? meeting.host._id.toString() !== userId : meeting.host.toString() !== userId) {
      const error: any = new Error('Unauthorized: Only the host can modify this meeting');
      error.statusCode = 403;
      throw error;
    }

    if (data.title !== undefined) meeting.title = data.title;
    if (data.description !== undefined) meeting.description = data.description;
    if (data.scheduledStartTime !== undefined) {
      meeting.scheduledStartTime = data.scheduledStartTime
        ? new Date(data.scheduledStartTime)
        : undefined;
    }
    if (data.scheduledEndTime !== undefined) {
      meeting.scheduledEndTime = data.scheduledEndTime
        ? new Date(data.scheduledEndTime)
        : undefined;
    }

    if (data.status !== undefined && data.status !== meeting.status) {
      meeting.status = data.status;
      if (data.status === 'active' && !meeting.actualStartTime) {
        meeting.actualStartTime = new Date();
      }
      if (data.status === 'completed' && !meeting.actualEndTime) {
        meeting.actualEndTime = new Date();
      }
    }

    await meeting.save();

    if (data.status === 'completed') {
      const participantIds = meeting.participants || [];
      for (const p of participantIds) {
        const pid = (p as any)?._id?.toString() || p?.toString();
        if (pid && pid !== userId) {
          notificationService
            .createNotification({
              recipient: pid,
              sender: userId,
              type: 'meeting_ended',
              title: 'Meeting Ended',
              message: `Meeting "${meeting.title}" has ended. View the post-meeting dashboard.`,
              link: `/meetings/${meeting.roomId}/dashboard`,
              metadata: { meetingId: meeting._id.toString(), roomId: meeting.roomId },
            })
            .catch(() => {});
        }
      }
    }

    return meeting.populate('host', 'name email avatar role');
  }

  /**
   * Deletes a meeting (Authorized for host only)
   */
  async deleteMeeting(idOrRoomId: string, userId: string): Promise<void> {
    const meeting = await this.getMeeting(idOrRoomId);

    // Authorization check
    if (meeting.host._id ? meeting.host._id.toString() !== userId : meeting.host.toString() !== userId) {
      const error: any = new Error('Unauthorized: Only the host can delete this meeting');
      error.statusCode = 403;
      throw error;
    }

    await Meeting.findByIdAndDelete(meeting._id);
  }

  /**
   * Adds a user to meeting participants list if not already present
   */
  async addParticipant(meetingId: string, userId: string): Promise<void> {
    await Meeting.findByIdAndUpdate(meetingId, {
      $addToSet: { participants: new mongoose.Types.ObjectId(userId) },
    });
  }
}

export const meetingService = new MeetingService();
