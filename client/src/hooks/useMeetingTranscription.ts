import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { transcriptApi } from '../services/transcript.api';
import { TranscriptSegment } from '../types/transcript.types';

export const useMeetingTranscription = (
  roomId: string,
  localStream: MediaStream | null,
  isAudioMuted: boolean
) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [providerName, setProviderName] = useState<string>('mock');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [hasRecordedAudio, setHasRecordedAudio] = useState<boolean>(false);
  const [hasRecordedVideo, setHasRecordedVideo] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedVideoChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const isTranscribingRef = useRef<boolean>(false);
  const isAudioMutedRef = useRef<boolean>(isAudioMuted);
  const chunkStartTimeRef = useRef<number>(0);

  // Keep refs synchronized
  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  // Recording timer
  useEffect(() => {
    let interval: any = null;
    if (isTranscribing) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTranscribing]);

  // Load existing transcript from MongoDB on mount or room change
  useEffect(() => {
    let isMounted = true;
    if (!roomId) return;

    setIsLoadingHistory(true);
    transcriptApi
      .getTranscript(roomId)
      .then((res) => {
        if (isMounted) {
          if (res?.segments) {
            setSegments(res.segments);
          }
          if (res?.transcript?.provider) {
            setProviderName(res.transcript.provider);
          }
        }
      })
      .catch((err) => {
        console.warn('[useMeetingTranscription] Could not load transcript history:', err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Socket event listener for real-time transcript broadcasts
  useEffect(() => {
    if (!roomId) return;
    const socket = socketService.getSocket();

    const handleNewSegment = (data: {
      roomId: string;
      segment: TranscriptSegment;
      provider?: string;
    }) => {
      if (data.roomId.toLowerCase() === roomId.toLowerCase()) {
        setSegments((prev) => {
          // Avoid duplicate segment IDs
          if (data.segment.id && prev.some((s) => s.id === data.segment.id)) {
            return prev;
          }
          return [...prev, data.segment];
        });

        if (data.provider) {
          setProviderName(data.provider);
        }
      }
    };

    socket.on('new-transcript-segment', handleNewSegment);

    return () => {
      socket.off('new-transcript-segment', handleNewSegment);
    };
  }, [roomId]);

  /**
   * Captures an audio chunk and sends it to the backend transcription service
   */
  const processAudioChunk = useCallback(
    async (blob: Blob, durationSec: number) => {
      if (!roomId || !blob || blob.size === 0 || isAudioMutedRef.current) return;

      const startTime = chunkStartTimeRef.current;
      const endTime = startTime + durationSec;
      chunkStartTimeRef.current = endTime;

      try {
        const socket = socketService.getSocket();

        // 1. Convert blob to base64 for fast socket streaming
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (base64Data && socket && socket.connected) {
            socket.emit('audio-chunk-transcribe', {
              roomId,
              audioBase64: base64Data,
              mimeType: blob.type || 'audio/webm',
              startTime,
              endTime,
            });
          }
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.warn('[useMeetingTranscription] Audio chunk upload failed:', err.message);
      }
    },
    [roomId]
  );

  /**
   * Starts MediaRecorder to record audio stream in discrete chunks
   */
  const startAudioCapture = useCallback(() => {
    if (!localStream) {
      console.warn('[useMeetingTranscription] No localStream available for audio recording');
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[useMeetingTranscription] No audio tracks found in localStream');
      return;
    }

    try {
      // Create dedicated audio stream
      const audioStream = new MediaStream([audioTracks[0]]);

      const supportedMime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorderOptions: MediaRecorderOptions = supportedMime ? { mimeType: supportedMime } : {};
      const recorder = new MediaRecorder(audioStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      let chunkStartTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && isTranscribingRef.current) {
          recordedAudioChunksRef.current.push(event.data);
          setHasRecordedAudio(true);
          const duration = Math.max(1, Math.round((Date.now() - chunkStartTime) / 1000));
          chunkStartTime = Date.now();
          processAudioChunk(event.data, duration);
        }
      };

      // Record in 4-second slices for regular transcription
      recorder.start(4000);
      console.log('[useMeetingTranscription] MediaRecorder audio capture started');

      // 2. Start Video Recorder (capturing local camera/screen video track + audio)
      try {
        const videoTracks = localStream.getVideoTracks();
        let videoStreamToRecord: MediaStream;

        if (videoTracks.length > 0) {
          videoStreamToRecord = new MediaStream([...videoTracks, ...audioTracks]);
        } else {
          // If camera is currently off, create a clean 720p video canvas track so recording produces a valid video file
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 1280, 720);
            ctx.fillStyle = '#6366f1';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('IntellMeet Meeting Recording', 640, 320);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '22px sans-serif';
            ctx.fillText(`Room: ${roomId}`, 640, 380);
          }
          const canvasStream = canvas.captureStream(15);
          videoStreamToRecord = new MediaStream([canvasStream.getVideoTracks()[0], ...audioTracks]);
        }

        const supportedVideoMime = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ].find((type) => MediaRecorder.isTypeSupported(type)) || '';

        const vRecorderOptions: MediaRecorderOptions = supportedVideoMime ? { mimeType: supportedVideoMime } : {};
        const vRecorder = new MediaRecorder(videoStreamToRecord, vRecorderOptions);
        videoRecorderRef.current = vRecorder;
        recordedVideoChunksRef.current = [];

        vRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && isTranscribingRef.current) {
            recordedVideoChunksRef.current.push(event.data);
            setHasRecordedVideo(true);
          }
        };

        vRecorder.start(1000);
        console.log('[useMeetingTranscription] MediaRecorder video capture started');
      } catch (vErr) {
        console.warn('[useMeetingTranscription] Video recorder notice:', vErr);
      }

      // In addition, if Web Speech API is supported, run it for immediate speech segment detection
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            if (!isTranscribingRef.current) return;
            const lastResultIndex = event.results.length - 1;
            const transcriptText = event.results[lastResultIndex][0].transcript.trim();
            const confidence = event.results[lastResultIndex][0].confidence || 0.95;

            if (transcriptText) {
              const socket = socketService.getSocket();
              if (socket && socket.connected) {
                socket.emit('add-transcript-segment', {
                  roomId,
                  text: transcriptText,
                  confidence,
                });
              }
            }
          };

          recognition.onerror = (e: any) => {
            if (e.error !== 'no-speech') {
              console.warn('[useMeetingTranscription] Web Speech recognition warning:', e.error);
            }
          };

          // Auto-restart recognition when browser stops listening after silence
          recognition.onend = () => {
            if (isTranscribingRef.current) {
              try {
                recognition.start();
              } catch {
                // already active or starting
              }
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e: any) {
          console.warn('[useMeetingTranscription] Web Speech not started:', e.message);
        }
      }
    } catch (err: any) {
      console.error('[useMeetingTranscription] Failed to start MediaRecorder:', err);
    }
  }, [localStream, processAudioChunk, roomId]);

  /**
   * Stops recording and clean up audio capture
   */
  const stopAudioCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
      } catch {
        // ignore stop error if already inactive
      }
      mediaRecorderRef.current = null;
    }

    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      try {
        if (videoRecorderRef.current.state === 'recording') {
          videoRecorderRef.current.requestData();
        }
        videoRecorderRef.current.stop();
      } catch {
        // ignore stop error if already inactive
      }
      videoRecorderRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore stop error if already stopped
      }
      speechRecognitionRef.current = null;
    }
    console.log('[useMeetingTranscription] Audio capture stopped');
  }, []);

  /**
   * Toggle transcription & recording state
   */
  const toggleTranscription = useCallback(() => {
    setIsTranscribing((prev) => {
      const nextState = !prev;
      if (nextState) {
        startAudioCapture();
      } else {
        stopAudioCapture();
      }
      return nextState;
    });
  }, [startAudioCapture, stopAudioCapture]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback(async () => {
    try {
      await transcriptApi.deleteTranscript(roomId);
      setSegments([]);
    } catch (err: any) {
      console.error('[useMeetingTranscription] Error clearing transcript:', err);
    }
  }, [roomId]);

  /**
   * Download the recorded audio file if recorded during call
   */
  const downloadAudioRecording = useCallback((filename?: string) => {
    if (recordedAudioChunksRef.current.length === 0) return false;
    const blob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `meeting-recording-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [roomId]);

  /**
   * Download the recorded video file (video + audio) captured during call
   */
  const downloadVideoRecording = useCallback((filename?: string) => {
    if (recordedVideoChunksRef.current.length === 0) return false;
    const blob = new Blob(recordedVideoChunksRef.current, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `meeting-video-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [roomId]);

  return {
    segments,
    isTranscribing,
    isRecording: isTranscribing,
    recordingSeconds,
    hasRecordedAudio,
    hasRecordedVideo,
    providerName,
    isLoadingHistory,
    startAudioCapture,
    stopAudioCapture,
    toggleTranscription,
    toggleRecording: toggleTranscription,
    clearTranscript,
    downloadAudioRecording,
    downloadVideoRecording,
  };
};
