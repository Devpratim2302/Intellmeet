import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  Copy,
  Check,
  Activity,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const {
    localStream,
    remotePeers,
    participants,
    isConnected,
    isAudioMuted,
    isVideoDisabled,
    signalingLogs,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(roomId || '');

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local media stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    navigate('/meetings');
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-dark-950 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header Bar */}
      <div className="glass-panel px-5 py-3 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Room: <span className="font-mono text-white">{roomId}</span>
            </span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors border border-white/5"
            title="Copy room link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Invite Link</span>
              </>
            )}
          </button>
        </div>

        {/* Presence Counter & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
            <Users className="w-3.5 h-3.5" />
            <span>
              {participants.length} Participant{participants.length === 1 ? '' : 's'}
            </span>
          </div>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showLogs
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>WebRTC Logs ({signalingLogs.length})</span>
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[450px]">
        {/* Video Grid (Left / Center) */}
        <div
          className={`grid gap-4 ${showLogs ? 'lg:col-span-3' : 'lg:col-span-4'} ${
            remotePeers.length === 0
              ? 'grid-cols-1 max-w-2xl mx-auto w-full'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
          }`}
        >
          {/* Local User Tile */}
          <div className="relative glass-card rounded-2xl overflow-hidden border border-white/10 bg-dark-900 flex items-center justify-center min-h-[280px]">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* User label */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white flex items-center gap-2">
              <span>{user?.name || 'You'} (Local)</span>
              {isAudioMuted && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
              Host / Peer
            </div>
          </div>

          {/* Remote Peer Tiles */}
          {remotePeers.map((peer) => (
            <RemotePeerTile key={peer.socketId} peer={peer} />
          ))}

          {/* Waiting for remote peer hint */}
          {remotePeers.length === 0 && (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400 animate-pulse" />
                Waiting for second participant to join this room...
              </span>
              <button
                onClick={handleCopyLink}
                className="text-brand-400 hover:text-brand-300 font-medium hover:underline"
              >
                Copy Link to open in 2nd browser
              </button>
            </div>
          )}
        </div>

        {/* Signaling Inspector Panel (Right) */}
        {showLogs && (
          <div className="lg:col-span-1 glass-panel p-4 rounded-2xl border border-white/10 flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                WebRTC Signaling
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] font-mono">
              {signalingLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-dark-900/60 border border-white/5 flex flex-col space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        log.type === 'offer'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : log.type === 'answer'
                            ? 'bg-purple-500/20 text-purple-300'
                            : log.type === 'ice'
                              ? 'bg-amber-500/20 text-amber-300'
                              : log.type === 'join'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 break-words">{log.message}</p>
                  {log.peerId && (
                    <span className="text-[9px] text-slate-500">
                      Peer: {log.peerId.slice(0, 8)}...
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="mt-4 flex items-center justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3.5 rounded-full transition-all border ${
            isAudioMuted
              ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
              : 'bg-dark-900 text-slate-200 border-white/10 hover:bg-white/10'
          }`}
          title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-full transition-all border ${
            isVideoDisabled
              ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
              : 'bg-dark-900 text-slate-200 border-white/10 hover:bg-white/10'
          }`}
          title={isVideoDisabled ? 'Start video' : 'Stop video'}
        >
          {isVideoDisabled ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <VideoIcon className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={handleLeave}
          className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-rose-600/30"
          title="End or Leave Call"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
};

// Sub-component for remote peer video
const RemotePeerTile: React.FC<{ peer: { socketId: string; stream: MediaStream } }> = ({
  peer,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative glass-card rounded-2xl overflow-hidden border border-brand-500/30 bg-dark-900 flex items-center justify-center min-h-[280px]">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Remote Peer ({peer.socketId.slice(0, 6)})</span>
      </div>
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-mono border border-brand-500/30">
        WebRTC P2P Active
      </div>
    </div>
  );
};
