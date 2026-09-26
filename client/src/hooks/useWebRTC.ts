import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { RoomParticipant, SignalingLog } from '../types/meeting.types';

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

export const useWebRTC = (roomId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [signalingLogs, setSignalingLogs] = useState<SignalingLog[]>([]);

  // Refs for state that event listeners need access to immediately
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

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
   * Initializes local user media stream (or synthetic fallback)
   */
  const initLocalStream = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      addLog('info', 'Local camera and microphone stream acquired');
      return stream;
    } catch (err: any) {
      console.warn(
        'Real camera/mic unavailable. Creating synthetic media track for signaling test:',
        err
      );
      // Fallback: create synthetic canvas video track + silent audio track for testing in virtual or permission-denied environments
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      let hue = 0;
      const drawInterval = setInterval(() => {
        ctx.fillStyle = `hsl(${hue}, 60%, 25%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('IntellMeet Test Camera', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText(
          new Date().toLocaleTimeString(),
          canvas.width / 2,
          canvas.height / 2 + 20
        );
        hue = (hue + 1) % 360;
      }, 100);

      const canvasStream = canvas.captureStream(30);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const audioDest = audioCtx.createMediaStreamDestination();
      osc.connect(audioDest);
      osc.start();

      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        audioDest.stream.getAudioTracks()[0],
      ]);

      (combinedStream as any)._cleanup = () => {
        clearInterval(drawInterval);
        osc.stop();
        audioCtx.close();
      };

      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);
      addLog('info', 'Synthetic media stream generated for WebRTC testing');
      return combinedStream;
    }
  }, [addLog]);

  /**
   * Creates an RTCPeerConnection for a remote peer socket
   */
  const createPeerConnection = useCallback(
    (targetSocketId: string, stream: MediaStream): RTCPeerConnection => {
      // Return existing connection if present
      if (peerConnections.current.has(targetSocketId)) {
        return peerConnections.current.get(targetSocketId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(targetSocketId, pc);

      // Add all local tracks to the connection
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
   * Main WebRTC & Socket lifecycle
   */
  useEffect(() => {
    if (!roomId) return;

    let mounted = true;
    const socket = socketService.connect();

    const setup = async () => {
      const stream = await initLocalStream();
      if (!mounted) return;

      // Join the meeting room
      try {
        await socketService.joinMeeting(roomId);
        setIsConnected(true);
        addLog('join', `Successfully joined room ${roomId}`);
      } catch (err: any) {
        addLog('info', `Error joining room: ${err.message}`);
      }

      /**
       * 1. Room participants list received (we are the joining peer)
       * We initiate offers to all peers already present in the room
       */
      socket.on(
        'meeting-participants',
        async (data: { roomId: string; participants: RoomParticipant[] }) => {
          if (!mounted) return;
          setParticipants(data.participants);

          // For each other participant, create peer connection and send offer
          for (const peer of data.participants) {
            if (peer.socketId === socket.id) continue;

            addLog(
              'offer',
              `Initiating WebRTC offer to peer ${peer.name}`,
              peer.socketId
            );
            const pc = createPeerConnection(peer.socketId, stream);

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
       * 3. Received WebRTC Offer from an incoming peer
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

          const pc = createPeerConnection(data.senderSocketId, stream);

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
       * 4. Received WebRTC Answer
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
       * 5. Received ICE Candidate
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
       * 6. Participant left
       */
      socket.on(
        'user-left',
        (data: { socketId: string; name: string; remaining: RoomParticipant[] }) => {
          if (!mounted) return;
          setParticipants(data.remaining);
          closePeerConnection(data.socketId);
          addLog('leave', `${data.name} left the meeting`, data.socketId);
        }
      );
    };

    setup();

    return () => {
      mounted = false;
      socketService.leaveMeeting(roomId);
      // Clean up peer connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      // Clean up local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        if ((localStreamRef.current as any)._cleanup) {
          (localStreamRef.current as any)._cleanup();
        }
        localStreamRef.current = null;
      }

      // Remove socket listeners
      socket.off('meeting-participants');
      socket.off('user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('user-left');
    };
  }, [roomId, initLocalStream, createPeerConnection, closePeerConnection, addLog]);

  /**
   * Media controls
   */
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      });
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoDisabled(!track.enabled);
      });
    }
  }, []);

  return {
    localStream,
    remotePeers: Array.from(remotePeers.values()),
    participants,
    isConnected,
    isAudioMuted,
    isVideoDisabled,
    signalingLogs,
    toggleAudio,
    toggleVideo,
  };
};
