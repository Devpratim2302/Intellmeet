import { Server, Socket } from 'socket.io';
import { presenceManager, RoomParticipant } from './presence.js';
import { meetingService } from '../services/meeting.service.js';
import { messageService } from '../services/message.service.js';

export const registerMeetingHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  /**
   * Client requests to join a meeting room
   */
  socket.on(
    'join-meeting',
    async (
      data: { roomId: string; isMuted?: boolean; isVideoOff?: boolean },
      callback?: (response: any) => void
    ) => {
      try {
        const { roomId, isMuted = false, isVideoOff = false } = data;
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
          isMuted,
          isVideoOff,
          isScreenSharing: false,
          isSpeaking: false,
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
    }
  );

  /**
   * Client updates media state (mic, camera, screen sharing, speaking status)
   */
  socket.on(
    'participant-state-update',
    (
      data: {
        roomId: string;
        isMuted?: boolean;
        isVideoOff?: boolean;
        isScreenSharing?: boolean;
        isSpeaking?: boolean;
      },
      callback?: (response: any) => void
    ) => {
      const { roomId, ...updates } = data;
      if (!roomId) {
        if (callback) callback({ success: false, message: 'Room ID is required' });
        return;
      }

      const normalizedRoom = roomId.toLowerCase();
      const socketRoom = `room:${normalizedRoom}`;

      const { participant, participants } = presenceManager.updateParticipantState(
        normalizedRoom,
        socket.id,
        updates
      );

      if (participant) {
        // Broadcast state change to all participants in the room
        io.to(socketRoom).emit('participant-state-changed', {
          socketId: socket.id,
          userId: user.userId,
          name: user.name,
          ...updates,
          participants,
        });
      }

      if (callback) {
        callback({ success: true, data: { participant } });
      }
    }
  );

  /**
   * Client sends a real-time chat message in the meeting
   */
  socket.on(
    'chat-message',
    async (
      data: { roomId: string; content: string },
      callback?: (response: any) => void
    ) => {
      try {
        const { roomId, content } = data;

        if (!roomId) {
          if (callback) callback({ success: false, message: 'Room ID is required' });
          return;
        }

        const trimmedContent = (content || '').trim();
        if (!trimmedContent) {
          if (callback)
            callback({
              success: false,
              message: 'Message content cannot be empty',
            });
          return;
        }

        if (trimmedContent.length > 2000) {
          if (callback)
            callback({
              success: false,
              message: 'Message cannot exceed 2000 characters',
            });
          return;
        }

        const normalizedRoom = roomId.toLowerCase();
        const socketRoom = `room:${normalizedRoom}`;

        // Persist message to database
        const savedMessage = await messageService.createMessage({
          roomId: normalizedRoom,
          senderId: user.userId,
          senderName: user.name,
          senderEmail: user.email,
          senderAvatar: user.avatar,
          content: trimmedContent,
          type: 'chat',
        });

        // Broadcast to all participants in the room (including sender)
        io.to(socketRoom).emit('chat-message', savedMessage);

        if (callback) {
          callback({ success: true, data: savedMessage });
        }
      } catch (err: any) {
        console.error('[Socket] Error in chat-message:', err);
        if (callback) {
          callback({
            success: false,
            message: err.message || 'Failed to send message',
          });
        }
      }
    }
  );

  /**
   * Retrieve chat history via socket
   */
  socket.on(
    'get-chat-history',
    async (
      data: { roomId: string; limit?: number },
      callback?: (response: any) => void
    ) => {
      try {
        const { roomId, limit = 100 } = data;
        if (!roomId) {
          if (callback) callback({ success: false, message: 'Room ID is required' });
          return;
        }

        const messages = await messageService.getMeetingMessages(roomId, limit);
        if (callback) {
          callback({ success: true, data: { messages, count: messages.length } });
        }
      } catch (err: any) {
        console.error('[Socket] Error in get-chat-history:', err);
        if (callback) {
          callback({ success: false, message: err.message || 'Failed to load messages' });
        }
      }
    }
  );

  /**
   * Explicit Screen Share Notification
   */
  socket.on(
    'screen-share-toggle',
    (
      data: { roomId: string; isSharing: boolean },
      callback?: (response: any) => void
    ) => {
      const { roomId, isSharing } = data;
      if (!roomId) return;

      const normalizedRoom = roomId.toLowerCase();
      const socketRoom = `room:${normalizedRoom}`;

      presenceManager.updateParticipantState(normalizedRoom, socket.id, {
        isScreenSharing: isSharing,
      });

      // Broadcast screen share notification to all other participants
      socket.to(socketRoom).emit('screen-share-status', {
        socketId: socket.id,
        userId: user.userId,
        name: user.name,
        isSharing,
      });

      io.to(socketRoom).emit('participant-state-changed', {
        socketId: socket.id,
        userId: user.userId,
        name: user.name,
        isScreenSharing: isSharing,
      });

      if (callback) {
        callback({ success: true });
      }
    }
  );

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
