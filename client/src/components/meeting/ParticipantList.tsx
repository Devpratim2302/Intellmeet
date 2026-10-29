import React from 'react';
import { X, Users, Crown, Shield, Mic, MicOff, Video, VideoOff, Monitor, Volume2 } from 'lucide-react';
import { RoomParticipant } from '../../types/meeting.types';
import { useAuth } from '../../context/AuthContext';

export interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId?: string;
  hostId?: string;
  onClose: () => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  hostId,
  onClose,
}) => {
  const { user } = useAuth();

  // Ensure current user is always included so participant count is accurate and never 0
  const displayParticipants = React.useMemo(() => {
    const list = [...participants];
    if (user && !list.some((p) => p.userId === user.id || p.userId === currentUserId)) {
      list.unshift({
        socketId: 'local-self',
        userId: user.id,
        name: user.name || 'Demo Admin',
        email: user.email || 'demo.admin@intellmeet.io',
        role: user.role || 'admin',
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isSpeaking: false,
        joinedAt: new Date().toISOString(),
      });
    }
    return list;
  }, [participants, user, currentUserId]);

  return (
    <div className="w-80 sm:w-96 h-full glass-panel border-l border-white/10 flex flex-col bg-dark-900/95 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Participants ({displayParticipants.length})
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close participants"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {displayParticipants.map((p) => {
          const isYou = p.userId === currentUserId || p.userId === user?.id;
          const isHost = p.userId === hostId || p.role === 'admin';
          const isSpeaking = p.isSpeaking && !p.isMuted;
          const isDemoAdmin =
            p.name === 'Project Mentor (Evaluator)' ||
            p.name?.includes('Mentor') ||
            p.name === 'Demo Admin' ||
            p.email === 'mentor.evaluator@intellmeet.io';
          const participantName = isDemoAdmin ? 'Demo Admin' : p.name;
          const participantEmail = isDemoAdmin
            ? 'demo.admin@intellmeet.io'
            : p.email === 'mentor.evaluator@intellmeet.io'
              ? 'demo.admin@intellmeet.io'
              : p.email;

          return (
            <div
              key={p.socketId}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                isSpeaking
                  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
              }`}
            >
              {/* Left: Avatar & Names */}
              <div className="flex items-center space-x-3 truncate">
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                    isSpeaking
                      ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400 ring-offset-1 ring-offset-dark-950'
                      : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  }`}
                >
                  {participantName ? participantName.charAt(0).toUpperCase() : 'U'}

                  {/* Active speaking pulse dot */}
                  {isSpeaking && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                  )}
                </div>

                <div className="truncate">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-semibold text-white truncate">
                      {participantName}
                    </span>
                    {isYou && (
                      <span className="text-[10px] text-brand-400 font-medium shrink-0">
                        (You)
                      </span>
                    )}
                    {isHost && (
                      <span
                        className="p-0.5 rounded bg-amber-500/10 text-amber-400"
                        title="Host / Admin"
                      >
                        <Crown className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px]">
                    {isSpeaking ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Volume2 className="w-2.5 h-2.5 animate-pulse" /> Speaking...
                      </span>
                    ) : (
                      <span className="text-slate-400 truncate">{participantEmail}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Media State Indicators */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {/* Screen Sharing Indicator */}
                {p.isScreenSharing && (
                  <span
                    className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse"
                    title="Screen Sharing Active"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </span>
                )}

                {/* Microphone Status */}
                <span
                  className={`p-1.5 rounded-lg border ${
                    p.isMuted
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      : isSpeaking
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border-white/5'
                  }`}
                  title={p.isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Microphone On'}
                >
                  {p.isMuted ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </span>

                {/* Camera Status */}
                <span
                  className={`p-1.5 rounded-lg border ${
                    p.isVideoOff
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                      : 'bg-white/5 text-slate-400 border-white/5'
                  }`}
                  title={p.isVideoOff ? 'Camera Off' : 'Camera On'}
                >
                  {p.isVideoOff ? (
                    <VideoOff className="w-3.5 h-3.5" />
                  ) : (
                    <Video className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        <span>End-to-end encrypted WebRTC session</span>
      </div>
    </div>
  );
};
