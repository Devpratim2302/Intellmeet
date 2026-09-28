import React from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users } from 'lucide-react';

export interface MeetingControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isParticipantsOpen: boolean;
  participantCount: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onLeave: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isVideoOff,
  isParticipantsOpen,
  participantCount,
  onToggleAudio,
  onToggleVideo,
  onToggleParticipants,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-center space-x-3 sm:space-x-4 py-3 px-5 rounded-2xl glass-panel border border-white/10 shadow-2xl backdrop-blur-xl">
      {/* Microphone Control */}
      <button
        onClick={onToggleAudio}
        className={`p-3.5 rounded-2xl transition-all border flex items-center justify-center ${
          isMuted
            ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
            : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Camera Control */}
      <button
        onClick={onToggleVideo}
        className={`p-3.5 rounded-2xl transition-all border flex items-center justify-center ${
          isVideoOff
            ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
            : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
      >
        {isVideoOff ? (
          <VideoOff className="w-5 h-5" />
        ) : (
          <VideoIcon className="w-5 h-5" />
        )}
      </button>

      {/* Participant List Toggle */}
      <button
        onClick={onToggleParticipants}
        className={`p-3.5 rounded-2xl transition-all border relative flex items-center justify-center ${
          isParticipantsOpen
            ? 'bg-brand-600 text-white border-brand-500 shadow-glow-brand'
            : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title="View participants"
      >
        <Users className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold border border-dark-950">
          {participantCount}
        </span>
      </button>

      {/* Leave Call */}
      <button
        onClick={onLeave}
        className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm flex items-center space-x-2 transition-all shadow-lg shadow-rose-600/30"
        title="Leave meeting"
      >
        <PhoneOff className="w-4 h-4" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  );
};
