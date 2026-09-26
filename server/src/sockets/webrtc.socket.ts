import { Server, Socket } from 'socket.io';

export interface WebRTCOfferPayload {
  targetSocketId: string;
  offer: any; // RTCSessionDescriptionInit
}

export interface WebRTCAnswerPayload {
  targetSocketId: string;
  answer: any; // RTCSessionDescriptionInit
}

export interface WebRTCIceCandidatePayload {
  targetSocketId: string;
  candidate: any; // RTCIceCandidateInit
}

/**
 * Registers isolated WebRTC peer signaling relay handlers
 */
export const registerWebRTCHandlers = (io: Server, socket: Socket) => {
  const senderUser = socket.data.user;

  /**
   * Relay WebRTC Offer from sender to target peer
   */
  socket.on('webrtc-offer', (payload: WebRTCOfferPayload) => {
    const { targetSocketId, offer } = payload;
    if (!targetSocketId || !offer) return;

    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      senderUser: {
        userId: senderUser?.userId,
        name: senderUser?.name,
        avatar: senderUser?.avatar,
      },
      offer,
    });
  });

  /**
   * Relay WebRTC Answer from recipient back to initiating peer
   */
  socket.on('webrtc-answer', (payload: WebRTCAnswerPayload) => {
    const { targetSocketId, answer } = payload;
    if (!targetSocketId || !answer) return;

    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer,
    });
  });

  /**
   * Relay ICE Candidate between connected peers
   */
  socket.on('webrtc-ice-candidate', (payload: WebRTCIceCandidatePayload) => {
    const { targetSocketId, candidate } = payload;
    if (!targetSocketId || !candidate) return;

    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });
};
