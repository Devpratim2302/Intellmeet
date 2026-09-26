export interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joinedAt: Date;
}

class PresenceManager {
  // Map of roomId -> Map<socketId, RoomParticipant>
  private rooms: Map<string, Map<string, RoomParticipant>> = new Map();

  /**
   * Adds a participant to a meeting room
   */
  addParticipant(roomId: string, participant: RoomParticipant): RoomParticipant[] {
    const normalizedRoom = roomId.toLowerCase();
    if (!this.rooms.has(normalizedRoom)) {
      this.rooms.set(normalizedRoom, new Map());
    }

    const roomParticipants = this.rooms.get(normalizedRoom)!;
    roomParticipants.set(participant.socketId, participant);

    return Array.from(roomParticipants.values());
  }

  /**
   * Removes a participant from a meeting room by socket ID
   */
  removeParticipant(
    roomId: string,
    socketId: string
  ): { removed?: RoomParticipant; remaining: RoomParticipant[] } {
    const normalizedRoom = roomId.toLowerCase();
    const roomParticipants = this.rooms.get(normalizedRoom);

    if (!roomParticipants) {
      return { remaining: [] };
    }

    const removed = roomParticipants.get(socketId);
    roomParticipants.delete(socketId);

    if (roomParticipants.size === 0) {
      this.rooms.delete(normalizedRoom);
    }

    return {
      removed,
      remaining: roomParticipants ? Array.from(roomParticipants.values()) : [],
    };
  }

  /**
   * Returns all active participants in a meeting room
   */
  getParticipants(roomId: string): RoomParticipant[] {
    const normalizedRoom = roomId.toLowerCase();
    const roomParticipants = this.rooms.get(normalizedRoom);
    return roomParticipants ? Array.from(roomParticipants.values()) : [];
  }

  /**
   * Finds all rooms a given socket ID is currently participating in
   */
  findRoomsForSocket(socketId: string): string[] {
    const activeRooms: string[] = [];
    for (const [roomId, participants] of this.rooms.entries()) {
      if (participants.has(socketId)) {
        activeRooms.push(roomId);
      }
    }
    return activeRooms;
  }
}

export const presenceManager = new PresenceManager();
