import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    const token = localStorage.getItem('intellmeet_token');
    if (this.socket) {
      if (this.socket.connected && (this.socket.auth as any)?.token === token) {
        return this.socket;
      }
      this.socket.disconnect();
      this.socket = null;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log(
        '[SocketService] Connected to signaling server, socket id:',
        this.socket?.id
      );
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketService] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
    });

    return this.socket;
  }

  getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinMeeting(roomId: string): Promise<any> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('join-meeting', { roomId }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          const err: any = new Error(response?.message || 'Failed to join meeting');
          err.meetingEnded = Boolean(response?.meetingEnded);
          reject(err);
        }
      });
    });
  }

  endMeeting(roomId: string): Promise<any> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('end-meeting', { roomId }, (res: any) => {
        resolve(res);
      });
    });
  }

  leaveMeeting(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave-meeting', { roomId });
    }
  }
}

export const socketService = new SocketService();
