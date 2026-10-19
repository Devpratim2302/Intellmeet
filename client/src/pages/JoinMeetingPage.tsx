import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { meetingApi } from '../services/meeting.api';
import {
  Video as VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Users,
  PhoneOff,
  FileText,
  Loader2,
} from 'lucide-react';

export const JoinMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get('roomId') || '';

  const [roomId, setRoomId] = useState(initialRoomId);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [endedRoomCode, setEndedRoomCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn('Camera preview not available:', err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setIsVideoOff(!isVideoOff);
  };

  const extractMeetingCode = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/meet-[a-zA-Z0-9-]+/i);
    if (match) return match[0].toLowerCase();
    return trimmed
      .replace(/.*\/meetings\//i, '')
      .replace(/.*\/room\//i, '')
      .split(/[?#/]/)[0]
      .trim()
      .toLowerCase();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    const cleanRoomId = extractMeetingCode(roomId);
    setIsChecking(true);
    setEndedRoomCode(null);

    try {
      const meeting = await meetingApi.getMeeting(cleanRoomId);
      if (meeting.status === 'completed' || meeting.status === 'cancelled') {
        setEndedRoomCode(cleanRoomId);
        setIsChecking(false);
        return;
      }
    } catch {
      // If ad-hoc room or unpersisted, proceed normally
    }

    setIsChecking(false);

    // Clean up preview tracks before navigating into room
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    navigate(`/meetings/${cleanRoomId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Camera Preview Tile */}
        <div className="space-y-4">
          <div className="relative glass-card rounded-3xl overflow-hidden border border-white/10 bg-dark-900 aspect-video flex items-center justify-center shadow-2xl">
            {localStream && !isVideoOff ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xl">
                  You
                </div>
                <span className="text-xs text-slate-400">Camera preview is off</span>
              </div>
            )}

            {/* In-tile preview controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-xl transition-colors ${
                  isMuted
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-2.5 rounded-xl transition-colors ${
                  isVideoOff
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isVideoOff ? 'Start video' : 'Stop video'}
              >
                {isVideoOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <VideoIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">
            Check your audio and video before entering the meeting.
          </p>
        </div>

        {/* Right: Join Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-glow-purple join-by-code-icon">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider block mb-1">
              Ready to collaborate?
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Join Meeting Room
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter the unique room identifier provided by your host.
            </p>
          </div>

          {endedRoomCode && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col space-y-2.5 animate-fade-in">
              <div className="flex items-center space-x-2 font-bold text-rose-400">
                <PhoneOff className="w-4 h-4 flex-shrink-0" />
                <span>This meeting has already ended</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                The session was completed and is closed to live callers. You can still access the AI meeting notes, transcript, and dashboard.
              </p>
              <Link
                to={`/meetings/${endedRoomCode}/dashboard`}
                className="inline-flex items-center space-x-1.5 font-semibold text-brand-300 hover:text-white underline underline-offset-4 pt-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Meeting Summary & Dashboard →</span>
              </Link>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <Input
              label="Room Identifier *"
              placeholder="e.g. meet-989d-e047"
              required
              value={roomId}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes('/') || val.includes('http')) {
                  setRoomId(extractMeetingCode(val));
                } else {
                  setRoomId(val);
                }
                if (endedRoomCode) setEndedRoomCode(null);
              }}
              icon={<Sparkles className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isChecking}
              className="w-full"
              icon={isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            >
              {isChecking ? 'Checking Room...' : 'Enter Meeting Room'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center space-x-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure WebRTC Peer Signaling</span>
          </div>
        </div>
      </div>
    </div>
  );
};
