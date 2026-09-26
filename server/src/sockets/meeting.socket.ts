import { Server, Socket } from 'socket.io';
import { presenceManager, RoomParticipant } from './presence.js';
import { meetingService } from '../services/meeting.service.js';

export const registerMeetingHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  /**
   * Client requests to join a meeting room
   */
  socket.on('join-meeting', async (data: { roomId: string }, callback?: (response: any) => void) => {
    try {
      const { roomId } = data;
      if (!roomId) {
        if (callback) callback({ success: false, message: 'Room ID is required' });
        return;
      }

      const normalizedRoom = roomId.toLowerCase();
      const socketRoom = `room:${normalizedRoom}`;

      // Join Socket.io room
      socket.join(socketRoom);

      // Create participant metadata
      const participant: RoomParticipant = {
        socketId: socket.id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        joinedAt: new Date(),
      };

      // Add to presence tracking
      const participants = presenceManager.addParticipant(normalizedRoom, participant);

      // Update DB meeting participants if meeting exists
      try {
        const meeting = await meetingService.getMeeting(normalizedRoom);
        if (meeting) {
          await meetingService.addParticipant(meeting._id.toString(), user.userId);
        }
      } catch {
        // Meeting lookup might fail for ad-hoc rooms, which is non-fatal
      }

      // 1. Send existing participants to the newly joined user
      socket.emit('meeting-participants', {
        roomId: normalizedRoom,
        participants,
      });

      // 2. Broadcast to other participants in the room that a new user joined
      socket.to(socketRoom).emit('user-joined', {
        roomId: normalizedRoom,
        participant,
        participants,
      });

      console.log(
        `[Socket] User ${user.name} (${user.userId}) joined room ${normalizedRoom} [Socket: ${socket.id}]. Total participants: ${participants.length}`
      );

      if (callback) {
        callback({
          success: true,
          data: { participant, participants },
        });
      }
    } catch (err: any) {
      console.error('[Socket] Error in join-meeting:', err);
      if (callback) {
        callback({ success: false, message: err.message || 'Failed to join meeting' });
      }
    }
  });

  /**
   * Client explicitly requests to leave a meeting room
   */
  socket.on('leave-meeting', (data: { roomId: string }, callback?: (response: any) => void) => {
    const { roomId } = data;
    if (!roomId) return;

    const normalizedRoom = roomId.toLowerCase();
    const socketRoom = `room:${normalizedRoom}`;

    socket.leave(socketRoom);

    const { removed, remaining } = presenceManager.removeParticipant(normalizedRoom, socket.id);

    if (removed) {
      io.to(socketRoom).emit('user-left', {
        roomId: normalizedRoom,
        socketId: socket.id,
        userId: removed.userId,
        name: removed.name,
        remaining,
      });

      console.log(
        `[Socket] User ${removed.name} left room ${normalizedRoom}. Remaining: ${remaining.length}`
      );
    }

    if (callback) {
      callback({ success: true });
    }
  });
};

/**
 * Handles automatic presence cleanup on socket disconnect
 */
export const handleSocketDisconnect = (io: Server, socket: Socket) => {
  const activeRooms = presenceManager.findRoomsForSocket(socket.id);

  for (const roomId of activeRooms) {
    const socketRoom = `room:${roomId}`;
    const { removed, remaining } = presenceManager.removeParticipant(roomId, socket.id);

    if (removed) {
      io.to(socketRoom).emit('user-left', {
        roomId,
        socketId: socket.id,
        userId: removed.userId,
        name: removed.name,
        remaining,
      });

      console.log(
        `[Socket] User ${removed.name} disconnected from room ${roomId}. Remaining: ${remaining.length}`
      );
    }
  }
};
