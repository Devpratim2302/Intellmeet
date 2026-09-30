import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  FileText,
} from 'lucide-react';

export interface MeetingControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
  isParticipantsOpen: boolean;
  isChatOpen: boolean;
  isTranscriptOpen?: boolean;
  isTranscribing?: boolean;
  transcriptSegmentCount?: number;
  participantCount: number;
  unreadCount?: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onToggleTranscript?: () => void;
  onLeave: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isSpeaking = false,
  isParticipantsOpen,
  isChatOpen,
  isTranscriptOpen = false,
  isTranscribing = false,
  transcriptSegmentCount = 0,
  participantCount,
  unreadCount = 0,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onToggleChat,
  onToggleTranscript,
  onLeave,
}) => {
  return (
    <div className="flex items-center justify-center space-x-2.5 sm:space-x-4 py-2.5 px-4 sm:px-6 rounded-2xl glass-panel border border-white/10 shadow-2xl backdrop-blur-xl">
      {/* Microphone Control */}
      <button
        onClick={onToggleAudio}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border flex items-center justify-center relative ${
          isMuted
            ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
            : isSpeaking
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-400/50 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40'
              : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Camera Control */}
      <button
        onClick={onToggleVideo}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border flex items-center justify-center ${
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

      {/* Screen Sharing Control */}
      <button
        onClick={onToggleScreenShare}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border flex items-center justify-center ${
          isScreenSharing
            ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/30'
            : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
      >
        {isScreenSharing ? (
          <MonitorOff className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </button>

      {/* Chat Toggle */}
      <button
        onClick={onToggleChat}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border relative flex items-center justify-center ${
          isChatOpen
            ? 'bg-brand-600 text-white border-brand-500 shadow-glow-brand'
            : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
        }`}
        title="Toggle Meeting Chat"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && !isChatOpen && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold border border-dark-950 animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Participant List Toggle */}
      <button
        onClick={onToggleParticipants}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border relative flex items-center justify-center ${
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

      {/* Transcript Toggle */}
      {onToggleTranscript && (
        <button
          onClick={onToggleTranscript}
          className={`p-3 sm:p-3.5 rounded-2xl transition-all border relative flex items-center justify-center ${
            isTranscriptOpen
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow-brand'
              : 'bg-dark-900/90 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
          title="Toggle Meeting Transcript & Live Captions"
        >
          <FileText className="w-5 h-5" />
          {isTranscribing && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-dark-950 animate-pulse ring-2 ring-emerald-400/40" />
          )}
          {transcriptSegmentCount !== undefined &&
            transcriptSegmentCount > 0 &&
            !isTranscriptOpen &&
            !isTranscribing && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold border border-dark-950">
                {transcriptSegmentCount > 99 ? '99+' : transcriptSegmentCount}
              </span>
            )}
        </button>
      )}

      {/* Leave Call */}
      <button
        onClick={onLeave}
        className="px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm flex items-center space-x-2 transition-all shadow-lg shadow-rose-600/30"
        title="Leave meeting"
      >
        <PhoneOff className="w-4 h-4" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  );
};
