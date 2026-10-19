import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { mediaService } from '../services/media.service';
import { meetingApi } from '../services/meeting.api';
import { RoomParticipant, SignalingLog, ChatMessage } from '../types/meeting.types';

// Standard public STUN servers for local/NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface RemotePeer {
  socketId: string;
  participant?: RoomParticipant;
  stream: MediaStream;
}

export const useWebRTC = (roomId: string, enabled: boolean = true) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMeetingEnded, setIsMeetingEnded] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [activeScreenSharePeerId, setActiveScreenSharePeerId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [signalingLogs, setSignalingLogs] = useState<SignalingLog[]>([]);

  // Meeting Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Refs for immediate access inside event callbacks
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isAudioMutedRef = useRef<boolean>(false);
  const isVideoDisabledRef = useRef<boolean>(false);

  const addLog = useCallback(
    (type: SignalingLog['type'], message: string, peerId?: string) => {
      const newLog: SignalingLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        peerId,
      };
      setSignalingLogs((prev) => [newLog, ...prev.slice(0, 49)]); // keep last 50
    },
    []
  );

  /**
   * Initializes local user media stream using isolated MediaService
   */
  const initLocalStream = useCallback(async (): Promise<MediaStream> => {
    if (cameraStreamRef.current) {
      return cameraStreamRef.current;
    }

    const stream = await mediaService.getUserMedia({
      video: true,
      audio: true,
    });

    cameraStreamRef.current = stream;
    localStreamRef.current = stream;
    setLocalStream(stream);
    addLog('info', 'Local media stream acquired');
    return stream;
  }, [addLog]);

  /**
   * Creates an RTCPeerConnection for a remote peer socket
   */
  const createPeerConnection = useCallback(
    (targetSocketId: string, stream: MediaStream): RTCPeerConnection => {
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(targetSocketId, pc);

      // Add all tracks of active stream (camera or screen share)
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle ICE Candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = socketService.getSocket();
          socket.emit('webrtc-ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
          addLog('ice', 'Dispatched ICE candidate to peer', targetSocketId);
        }
      };

      // Handle incoming remote media track
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        addLog(
          'info',
          `Received remote media track (${event.track.kind}) from peer`,
          targetSocketId
        );

        setRemotePeers((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(targetSocketId);
          updated.set(targetSocketId, {
            socketId: targetSocketId,
            participant: existing?.participant,
            stream: remoteStream,
          });
          return updated;
        });
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        addLog('info', `Peer connection state: ${pc.connectionState}`, targetSocketId);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          closePeerConnection(targetSocketId);
        }
      };

      return pc;
    },
    [addLog]
  );

  /**
   * Closes a peer connection
   */
  const closePeerConnection = useCallback((socketId: string) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }
    setRemotePeers((prev) => {
      const updated = new Map(prev);
      updated.delete(socketId);
      return updated;
    });
  }, []);

  /**
   * Stops screen sharing and restores camera stream
   */
  const stopScreenShare = useCallback(() => {
    if (!screenStreamRef.current) return;

    mediaService.stopMediaStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setIsScreenSharing(false);

    // Restore camera video track on all peer connections
    if (cameraStreamRef.current) {
      const cameraVideoTrack = cameraStreamRef.current.getVideoTracks()[0];
      if (cameraVideoTrack) {
        mediaService.replaceVideoTrack(peerConnections.current, cameraVideoTrack);
      }
      localStreamRef.current = cameraStreamRef.current;
      setLocalStream(cameraStreamRef.current);
    }

    // Notify other peers via socket
    const socket = socketService.getSocket();
    if (socket?.connected && roomId) {
      socket.emit('participant-state-update', {
        roomId,
        isScreenSharing: false,
      });
      socket.emit('screen-share-toggle', {
        roomId,
        isSharing: false,
      });
    }

    addLog('info', 'Screen sharing stopped; restored camera stream');
  }, [roomId, addLog]);

  /**
   * Starts screen sharing using WebRTC track replacement
   */
  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) return;

    try {
      const screenStream = await mediaService.getDisplayMedia();
      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];

      if (!screenVideoTrack) {
        throw new Error('No video track found in screen capture stream');
      }

      // Handle user stopping screen share via browser floating bar
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      // Hot-swap video track across all active RTCPeerConnections
      mediaService.replaceVideoTrack(peerConnections.current, screenVideoTrack);

      // Create local preview stream combining screen video + camera audio
      const audioTracks = cameraStreamRef.current?.getAudioTracks() || [];
      const combined = new MediaStream([screenVideoTrack, ...audioTracks]);
      localStreamRef.current = combined;
      setLocalStream(combined);
      setIsScreenSharing(true);

      // Notify other participants via Socket.io
      const socket = socketService.getSocket();
      if (socket?.connected && roomId) {
        socket.emit('participant-state-update', {
          roomId,
          isScreenSharing: true,
        });
        socket.emit('screen-share-toggle', {
          roomId,
          isSharing: true,
        });
      }

      addLog('info', 'Started screen sharing with WebRTC track replacement');
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('[WebRTC] Failed to start screen sharing:', err);
        addLog('info', `Screen sharing error: ${err.message}`);
      }
    }
  }, [isScreenSharing, roomId, stopScreenShare, addLog]);

  /**
   * Toggles local microphone state and synchronizes with presence
   */
  const toggleAudio = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        const newMuted = !track.enabled;
        isAudioMutedRef.current = newMuted;
        setIsAudioMuted(newMuted);

        // Synchronize state with presence server
        const socket = socketService.getSocket();
        if (socket?.connected && roomId) {
          socket.emit('participant-state-update', {
            roomId,
            isMuted: newMuted,
          });
        }
      });
    }
  }, [roomId]);

  /**
   * Toggles local camera state and synchronizes with presence
   */
  const toggleVideo = useCallback(async () => {
    const nextDisabled = !isVideoDisabledRef.current;
    isVideoDisabledRef.current = nextDisabled;
    setIsVideoDisabled(nextDisabled);

    const stream = cameraStreamRef.current || localStreamRef.current;
    const videoTracks = stream?.getVideoTracks() || [];
    const liveTrack = videoTracks.find((t) => t.readyState === 'live');

    if (liveTrack) {
      videoTracks.forEach((track) => {
        track.enabled = !nextDisabled;
      });
      if (localStreamRef.current && localStreamRef.current !== stream) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = !nextDisabled;
        });
      }
    } else if (!nextDisabled) {
      try {
        const freshStream = await mediaService.getUserMedia({ video: true, audio: false });
        const freshTrack = freshStream.getVideoTracks()[0];
        if (freshTrack) {
          if (cameraStreamRef.current) {
            cameraStreamRef.current.getVideoTracks().forEach((t) => {
              cameraStreamRef.current?.removeTrack(t);
              t.stop();
            });
            cameraStreamRef.current.addTrack(freshTrack);
          } else {
            cameraStreamRef.current = freshStream;
          }

          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach((t) => {
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(freshTrack);
            const updated = new MediaStream(localStreamRef.current.getTracks());
            localStreamRef.current = updated;
            setLocalStream(updated);
          } else {
            setLocalStream(cameraStreamRef.current);
          }

          mediaService.replaceVideoTrack(peerConnections.current, freshTrack);
          freshTrack.enabled = true;
        }
      } catch (err) {
        console.warn('[WebRTC] Failed to re-acquire video track:', err);
      }
    }

    // Synchronize state with presence server
    const socket = socketService.getSocket();
    if (socket?.connected && roomId) {
      socket.emit('participant-state-update', {
        roomId,
        isVideoOff: nextDisabled,
      });
    }
  }, [roomId]);

  /**
   * Sends a chat message via Socket.io with fallback to REST API
   */
  const sendMessage = useCallback(
    async (content: string): Promise<ChatMessage> => {
      const trimmed = content.trim();
      if (!trimmed) {
        throw new Error('Message cannot be empty');
      }
      if (trimmed.length > 2000) {
        throw new Error('Message cannot exceed 2000 characters');
      }

      const socket = socketService.getSocket();

      return new Promise<ChatMessage>((resolve, reject) => {
        if (socket && socket.connected) {
          socket.emit(
            'chat-message',
            { roomId, content: trimmed },
            (response: any) => {
              if (response?.success) {
                resolve(response.data);
              } else {
                // If socket response returned error, try fallback REST endpoint
                meetingApi
                  .sendMeetingMessage(roomId, trimmed)
                  .then(resolve)
                  .catch(reject);
              }
            }
          );
        } else {
          meetingApi
            .sendMeetingMessage(roomId, trimmed)
            .then(resolve)
            .catch(reject);
        }
      });
    },
    [roomId]
  );

  /**
   * Resets unread chat badge count (e.g., when chat drawer is opened)
   */
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  /**
   * Main WebRTC, Socket, Voice Detection, and Chat lifecycle
   */
  useEffect(() => {
    if (!roomId || !enabled) return;

    let mounted = true;
    let vadCleanup = () => {};
    const socket = socketService.connect();

    // 0. Load persistent previous messages when joining
    meetingApi
      .getMeetingMessages(roomId)
      .then((history) => {
        if (mounted) {
          setMessages(history);
        }
      })
      .catch((err) => {
        console.warn('[Chat] Could not load message history:', err.message);
      });

    const setup = async () => {
      const stream = await initLocalStream();
      if (!mounted) return;

      // Setup local Voice Activity Detection (VAD)
      vadCleanup = mediaService.setupVoiceActivityDetection(stream, (speaking) => {
        if (!mounted) return;
        setIsSpeaking(speaking);

        if (socket?.connected) {
          socket.emit('participant-state-update', {
            roomId,
            isSpeaking: speaking,
          });
        }
      });

      // Join the meeting room with initial media state
      try {
        await socketService.joinMeeting(roomId);
        setIsConnected(true);
        addLog('join', `Successfully joined room ${roomId}`);
      } catch (err: any) {
        addLog('info', `Error joining room: ${err.message}`);
        if (err?.meetingEnded) {
          setIsMeetingEnded(true);
          if (cameraStreamRef.current) {
            mediaService.stopMediaStream(cameraStreamRef.current);
            cameraStreamRef.current = null;
          }
          if (screenStreamRef.current) {
            mediaService.stopMediaStream(screenStreamRef.current);
            screenStreamRef.current = null;
          }
          setLocalStream(null);
          return;
        }
      }

      /**
       * Handle Meeting Ended broadcast
       */
      socket.on('meeting-ended', () => {
        if (!mounted) return;
        addLog('leave', 'Meeting was concluded by host');
        setIsMeetingEnded(true);
        setIsConnected(false);
        if (cameraStreamRef.current) {
          mediaService.stopMediaStream(cameraStreamRef.current);
          cameraStreamRef.current = null;
        }
        if (screenStreamRef.current) {
          mediaService.stopMediaStream(screenStreamRef.current);
          screenStreamRef.current = null;
        }
        setLocalStream(null);
      });

      /**
       * 1. Room participants list received upon joining
       */
      socket.on(
        'meeting-participants',
        async (data: { roomId: string; participants: RoomParticipant[] }) => {
          if (!mounted) return;
          setParticipants(data.participants);

          // Check if any participant is currently screen sharing
          const sharingPeer = data.participants.find((p) => p.isScreenSharing);
          if (sharingPeer) {
            setActiveScreenSharePeerId(sharingPeer.socketId);
          }

          // For each other participant, create peer connection and send offer
          for (const peer of data.participants) {
            if (peer.socketId === socket.id) continue;

            addLog(
              'offer',
              `Initiating WebRTC offer to peer ${peer.name}`,
              peer.socketId
            );
            const activeStream = localStreamRef.current || stream;
            const pc = createPeerConnection(peer.socketId, activeStream);

            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              socket.emit('webrtc-offer', {
                targetSocketId: peer.socketId,
                offer,
              });
            } catch (err) {
              console.error('Error creating offer:', err);
            }
          }
        }
      );

      /**
       * 2. New user joined after us
       */
      socket.on(
        'user-joined',
        (data: { participant: RoomParticipant; participants: RoomParticipant[] }) => {
          if (!mounted) return;
          setParticipants(data.participants);
          addLog(
            'join',
            `${data.participant.name} joined the meeting`,
            data.participant.socketId
          );
        }
      );

      /**
       * 3. Synchronize participant state (mic, camera, screen share, speaking)
       */
      socket.on('participant-state-changed', (data: any) => {
        if (!mounted) return;
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.socketId === data.socketId || p.userId === data.userId) {
              return {
                ...p,
                isMuted: data.isMuted !== undefined ? data.isMuted : p.isMuted,
                isVideoOff: data.isVideoOff !== undefined ? data.isVideoOff : p.isVideoOff,
                isScreenSharing:
                  data.isScreenSharing !== undefined
                    ? data.isScreenSharing
                    : p.isScreenSharing,
                isSpeaking:
                  data.isSpeaking !== undefined ? data.isSpeaking : p.isSpeaking,
              };
            }
            return p;
          })
        );

        if (data.isScreenSharing !== undefined) {
          if (data.isScreenSharing) {
            setActiveScreenSharePeerId(data.socketId);
            addLog('info', `${data.name || 'A participant'} started screen sharing`, data.socketId);
          } else {
            setActiveScreenSharePeerId((prev) => (prev === data.socketId ? null : prev));
            addLog('info', `${data.name || 'A participant'} stopped screen sharing`, data.socketId);
          }
        }
      });

      /**
       * 4. Real-time chat message received
       */
      socket.on('chat-message', (message: ChatMessage) => {
        if (!mounted) return;
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setUnreadCount((c) => c + 1);
      });

      /**
       * 5. WebRTC Offer from an incoming peer
       */
      socket.on(
        'webrtc-offer',
        async (data: {
          senderSocketId: string;
          senderUser: any;
          offer: RTCSessionDescriptionInit;
        }) => {
          if (!mounted) return;
          addLog(
            'offer',
            `Received offer from ${data.senderUser?.name || 'peer'}`,
            data.senderSocketId
          );

          const activeStream = localStreamRef.current || stream;
          const pc = createPeerConnection(data.senderSocketId, activeStream);

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('webrtc-answer', {
              targetSocketId: data.senderSocketId,
              answer,
            });
            addLog('answer', `Sent WebRTC answer to peer`, data.senderSocketId);
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        }
      );

      /**
       * 6. WebRTC Answer received
       */
      socket.on(
        'webrtc-answer',
        async (data: { senderSocketId: string; answer: RTCSessionDescriptionInit }) => {
          if (!mounted) return;
          addLog('answer', `Received answer from peer`, data.senderSocketId);

          const pc = peerConnections.current.get(data.senderSocketId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (err) {
              console.error('Error setting remote description from answer:', err);
            }
          }
        }
      );

      /**
       * 7. WebRTC ICE Candidate received
       */
      socket.on(
        'webrtc-ice-candidate',
        async (data: { senderSocketId: string; candidate: RTCIceCandidateInit }) => {
          if (!mounted) return;
          const pc = peerConnections.current.get(data.senderSocketId);
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              addLog('ice', `Added ICE candidate from peer`, data.senderSocketId);
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
        }
      );

      /**
       * 8. Participant left
       */
      socket.on(
        'user-left',
        (data: { socketId: string; name: string; remaining: RoomParticipant[] }) => {
          if (!mounted) return;
          setParticipants(data.remaining);
          closePeerConnection(data.socketId);
          setActiveScreenSharePeerId((prev) => (prev === data.socketId ? null : prev));
          addLog('leave', `${data.name} left the meeting`, data.socketId);
        }
      );
    };

    setup();

    return () => {
      mounted = false;
      vadCleanup();
      socketService.leaveMeeting(roomId);

      // Clean up peer connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      // Clean up screen share stream if active
      if (screenStreamRef.current) {
        mediaService.stopMediaStream(screenStreamRef.current);
        screenStreamRef.current = null;
      }

      // Clean up local camera stream tracks
      if (cameraStreamRef.current) {
        mediaService.stopMediaStream(cameraStreamRef.current);
        cameraStreamRef.current = null;
      }

      localStreamRef.current = null;

      // Remove socket listeners
      socket.off('meeting-participants');
      socket.off('user-joined');
      socket.off('participant-state-changed');
      socket.off('chat-message');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('user-left');
      socket.off('meeting-ended');
    };
  }, [roomId, enabled, initLocalStream, createPeerConnection, closePeerConnection, addLog]);

  return {
    localStream,
    remotePeers: Array.from(remotePeers.values()),
    participants,
    isConnected,
    isMeetingEnded,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    activeScreenSharePeerId,
    isSpeaking,
    signalingLogs,
    messages,
    unreadCount,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    resetUnreadCount,
  };
};
