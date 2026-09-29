/**
 * MediaService
 * Isolated service for media stream management:
 * - Camera & microphone acquisition with synthetic fallback
 * - Screen sharing acquisition with synthetic presentation fallback
 * - Voice Activity Detection (VAD) via Web Audio API AnalyserNode
 * - WebRTC RTCRtpSender video track hot-swapping
 */
export class MediaService {
  /**
   * Acquires local camera & microphone streams with canvas/audio fallback
   */
  async getUserMedia(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream> {
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
      } catch (err: any) {
        console.warn('[MediaService] Real camera/mic unavailable. Creating synthetic media track:', err.message);
      }
    }

    return this.createSyntheticCameraStream();
  }

  /**
   * Acquires browser screen sharing display media with fallback
   */
  async getDisplayMedia(): Promise<MediaStream> {
    if (navigator?.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
          } as any,
          audio: false,
        });
        return stream;
      } catch (err: any) {
        // If user cancelled, rethrow so caller can handle gracefully
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          throw err;
        }
        console.warn('[MediaService] Real getDisplayMedia failed, falling back to synthetic presentation stream:', err);
      }
    }

    return this.createSyntheticScreenStream();
  }

  /**
   * Voice Activity Detection (VAD) using Web Audio API
   * Analyzes audio frequency and volume levels to detect when participant is speaking
   */
  setupVoiceActivityDetection(
    stream: MediaStream,
    onSpeakingChange: (isSpeaking: boolean) => void,
    threshold = 0.025
  ): () => void {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      return () => {};
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return () => {};

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isSpeaking = false;
      let silenceTimer: any = null;
      let active = true;

      const checkVolume = () => {
        if (!active) return;

        // If audio track is disabled (muted), force speaking state to false
        if (!audioTrack.enabled) {
          if (isSpeaking) {
            isSpeaking = false;
            onSpeakingChange(false);
          }
          requestAnimationFrame(checkVolume);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength / 255;

        if (average > threshold) {
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
          if (!isSpeaking) {
            isSpeaking = true;
            onSpeakingChange(true);
          }
        } else if (isSpeaking && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (active) {
              isSpeaking = false;
              onSpeakingChange(false);
            }
            silenceTimer = null;
          }, 350);
        }

        requestAnimationFrame(checkVolume);
      };

      const animId = requestAnimationFrame(checkVolume);

      return () => {
        active = false;
        cancelAnimationFrame(animId);
        if (silenceTimer) clearTimeout(silenceTimer);
        try {
          source.disconnect();
          analyser.disconnect();
          audioCtx.close();
        } catch {}
      };
    } catch (e) {
      console.warn('[MediaService] Could not initialize AudioContext for speaking detection:', e);
      return () => {};
    }
  }

  /**
   * Hot-swaps the video track across all active RTCPeerConnections
   */
  replaceVideoTrack(
    peerConnections: Map<string, RTCPeerConnection>,
    newVideoTrack: MediaStreamTrack | null
  ): void {
    peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && newVideoTrack) {
        sender.replaceTrack(newVideoTrack).catch((err) => {
          console.error('[MediaService] Failed to replace video track on peer connection:', err);
        });
      }
    });
  }

  /**
   * Stops all tracks in a MediaStream and runs any attached cleanup handlers
   */
  stopMediaStream(stream: MediaStream | null): void {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });

    if ((stream as any)._cleanup) {
      try {
        (stream as any)._cleanup();
      } catch {}
    }
  }

  /**
   * Helper: Creates a synthetic camera video stream with dynamic canvas and silent audio
   */
  private createSyntheticCameraStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    let hue = 200;

    const drawInterval = setInterval(() => {
      ctx.fillStyle = `hsl(${hue}, 45%, 18%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IntellMeet Video Feed', canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px Inter, monospace';
      ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 18);

      hue = (hue + 1) % 360;
    }, 100);

    const canvasStream = canvas.captureStream(30);

    let audioDestTrack: MediaStreamTrack | null = null;
    let audioCleanup = () => {};

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0001; // virtually silent
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const audioDest = audioCtx.createMediaStreamDestination();
        osc.connect(audioDest);
        osc.start();
        audioDestTrack = audioDest.stream.getAudioTracks()[0];

        audioCleanup = () => {
          osc.stop();
          audioCtx.close();
        };
      }
    } catch {}

    const tracks: MediaStreamTrack[] = [canvasStream.getVideoTracks()[0]];
    if (audioDestTrack) {
      tracks.push(audioDestTrack);
    }

    const combinedStream = new MediaStream(tracks);
    (combinedStream as any)._cleanup = () => {
      clearInterval(drawInterval);
      audioCleanup();
    };

    return combinedStream;
  }

  /**
   * Helper: Creates a synthetic screen sharing stream for testing or headless environments
   */
  private createSyntheticScreenStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    let tick = 0;

    const drawInterval = setInterval(() => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Presentation screen header
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 40, canvas.width - 80, 70);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💻 IntellMeet Screen Presentation', 70, 84);

      // Presentation body
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 130, canvas.width - 80, canvas.height - 180);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Desktop / Application Window', canvas.width / 2, 280);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Inter, monospace';
      ctx.fillText(`Live Stream Active • Frame ${tick++}`, canvas.width / 2, 340);
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, canvas.width / 2, 380);

      // Simulated code/chart box
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 250, 430, 500, 160);
      ctx.fillStyle = '#60a5fa';
      ctx.font = '16px monospace';
      ctx.fillText('// WebRTC Screen Track Active', canvas.width / 2, 510);
    }, 100);

    const stream = canvas.captureStream(30);

    (stream as any)._cleanup = () => {
      clearInterval(drawInterval);
    };

    return stream;
  }
}

export const mediaService = new MediaService();
