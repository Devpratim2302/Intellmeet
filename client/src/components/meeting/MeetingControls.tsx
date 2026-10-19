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
  Circle,
  Square,
} from 'lucide-react';

export interface MeetingControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
  isRecording?: boolean;
  recordingSeconds?: number;
  isParticipantsOpen: boolean;
  isChatOpen: boolean;
  isTranscriptOpen?: boolean;
  isTranscribing?: boolean;
  transcriptSegmentCount?: number;
  participantCount: number;
  unreadCount?: number;
  isHost?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording?: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onToggleTranscript?: () => void;
  onEndMeeting?: () => void;
  onLeave: () => void;
}

const formatDuration = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isSpeaking = false,
  isRecording = false,
  recordingSeconds = 0,
  isParticipantsOpen,
  isChatOpen,
  isTranscriptOpen = false,
  isTranscribing = false,
  transcriptSegmentCount = 0,
  participantCount,
  unreadCount = 0,
  isHost = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleParticipants,
  onToggleChat,
  onToggleTranscript,
  onEndMeeting,
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
              : 'meeting-control-btn'
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
            : 'meeting-control-btn'
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
            : 'meeting-control-btn'
        }`}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
      >
        {isScreenSharing ? (
          <MonitorOff className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </button>

      {/* Recording & Live AI Transcription Control */}
      {onToggleRecording && (
        <button
          onClick={onToggleRecording}
          className={`px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl transition-all border flex items-center justify-center space-x-2 ${
            isRecording
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/40'
              : 'meeting-control-btn meeting-record-btn'
          }`}
          title={isRecording ? 'Stop Recording & Transcription' : 'Start Recording & Live AI Transcription'}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-rose-500 text-rose-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-rose-400">
                {recordingSeconds !== undefined ? formatDuration(recordingSeconds) : 'REC'}
              </span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 fill-rose-500 text-rose-500 shrink-0" />
              <span className="hidden sm:inline text-xs font-semibold meeting-record-text">
                Record
              </span>
            </>
          )}
        </button>
      )}

      {/* Chat Toggle */}
      <button
        onClick={onToggleChat}
        className={`p-3 sm:p-3.5 rounded-2xl transition-all border relative flex items-center justify-center ${
          isChatOpen
            ? 'bg-brand-600 text-white border-brand-500 shadow-glow-brand'
            : 'meeting-control-btn'
        }`}
        title="Toggle Meeting Chat"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadCount > 0 && !isChatOpen && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold border border-dark-950 meeting-badge-border animate-bounce">
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
            : 'meeting-control-btn'
        }`}
        title="View participants"
      >
        <Users className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold border border-dark-950 meeting-badge-border">
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
              : 'meeting-control-btn'
          }`}
          title="Toggle Meeting Transcript & Live Captions"
        >
          <FileText className="w-5 h-5" />
          {isTranscribing && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-dark-950 meeting-badge-border animate-pulse ring-2 ring-emerald-400/40" />
          )}
          {transcriptSegmentCount !== undefined &&
            transcriptSegmentCount > 0 &&
            !isTranscriptOpen &&
            !isTranscribing && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold border border-dark-950 meeting-badge-border">
                {transcriptSegmentCount > 99 ? '99+' : transcriptSegmentCount}
              </span>
            )}
        </button>
      )}

      {/* End Meeting (Host Only) */}
      {isHost && onEndMeeting && (
        <button
          onClick={onEndMeeting}
          className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-all shadow-lg shadow-rose-700/40 border border-rose-500/50"
          title="End meeting for all participants"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">End Meeting</span>
        </button>
      )}

      {/* Leave Call */}
      <button
        onClick={onLeave}
        className="px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-2xl meeting-leave-btn font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-all border"
        title="Leave meeting"
      >
        <PhoneOff className="w-4 h-4 text-rose-500" />
        <span className="hidden sm:inline">Leave</span>
      </button>
    </div>
  );
};
