import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import { meetingApi } from '../services/meeting.api';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import { ParticipantList } from '../components/meeting/ParticipantList';
import { ChatPanel } from '../components/meeting/ChatPanel';
import { TranscriptPanel } from '../components/meeting/TranscriptPanel';
import { useMeetingTranscription } from '../hooks/useMeetingTranscription';
import { Copy, Check, Clock, Activity, Terminal, Monitor, Sparkles } from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetingTitle, setMeetingTitle] = useState<string>('Meeting Room');
  const [meetingHostId, setMeetingHostId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Fetch meeting metadata if available
  useEffect(() => {
    if (roomId) {
      meetingApi
        .getMeeting(roomId)
        .then((m) => {
          setMeetingTitle(m.title);
          setMeetingHostId(m.host?.id || (m.host as any));
        })
        .catch(() => {
          // If ad-hoc room, keep default title
        });
    }
  }, [roomId]);

  // Meeting duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // WebRTC Hook
  const {
    localStream,
    remotePeers,
    participants,
    isConnected,
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
  } = useWebRTC(roomId);

  // Meeting Transcription Hook
  const {
    segments,
    isTranscribing,
    providerName,
    toggleTranscription,
    clearTranscript,
  } = useMeetingTranscription(roomId, localStream, isAudioMuted);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost =
    Boolean(meetingHostId && (meetingHostId === user?.id || meetingHostId === (user as any)?._id));

  const handleEndMeeting = async () => {
    if (window.confirm('End this meeting for all participants and proceed to the post-meeting dashboard?')) {
      try {
        await meetingApi.updateMeeting(roomId, { status: 'completed' });
      } catch (err) {
        console.warn('Failed to mark meeting completed:', err);
      }
      navigate(`/meetings/${roomId}/dashboard`);
    }
  };

  const handleLeave = () => {
    navigate(`/meetings/${roomId}/dashboard`);
  };

  const handleToggleTranscript = () => {
    const nextState = !isTranscriptOpen;
    setIsTranscriptOpen(nextState);
    if (nextState) {
      setIsChatOpen(false);
      setIsParticipantsOpen(false);
    }
  };

  const handleToggleChat = () => {
    const nextState = !isChatOpen;
    setIsChatOpen(nextState);
    if (nextState) {
      resetUnreadCount();
      setIsParticipantsOpen(false); // Close participants when opening chat on smaller screens
      setIsTranscriptOpen(false);
    }
  };

  const handleToggleParticipants = () => {
    const nextState = !isParticipantsOpen;
    setIsParticipantsOpen(nextState);
    if (nextState) {
      setIsChatOpen(false); // Close chat when opening participants on smaller screens
      setIsTranscriptOpen(false);
    }
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  // Determine if anyone in the call is currently presenting
  const isSomeoneSharing = isScreenSharing || !!activeScreenSharePeerId;

  // Find presenter information
  const presenter = isScreenSharing
    ? { isLocal: true, name: user?.name || 'You', stream: localStream }
    : activeScreenSharePeerId
      ? {
          isLocal: false,
          name:
            participants.find((p) => p.socketId === activeScreenSharePeerId)?.name ||
            'Presenter',
          stream: remotePeers.find((p) => p.socketId === activeScreenSharePeerId)?.stream || null,
        }
      : null;

  // Determine grid layout based on number of active video feeds
  const totalTiles = 1 + remotePeers.length;
  const getGridClass = () => {
    if (totalTiles === 1) return 'grid-cols-1 max-w-3xl mx-auto w-full';
    if (totalTiles === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full';
    if (totalTiles <= 4)
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-6xl mx-auto w-full';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto w-full';
  };

  return (
    <div className="h-[calc(100vh-65px)] bg-dark-950 flex flex-col justify-between overflow-hidden">
      {/* Top Header Bar */}
      <header className="glass-panel px-6 py-3 border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3 truncate">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {meetingTitle}
            </h1>
          </div>

          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-mono">|</span>
            <span className="text-xs text-slate-400 font-mono">{roomId}</span>
          </div>

          {/* Active Screen Share Notice in Header */}
          {isSomeoneSharing && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
              <Monitor className="w-3.5 h-3.5" />
              <span>{presenter?.name} is sharing screen</span>
            </div>
          )}

          {/* Active Live Transcription Notice in Header */}
          {isTranscribing && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Transcribing ({segments.length})</span>
            </div>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors border border-white/5"
            title="Copy invite link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Invite Link</span>
              </>
            )}
          </button>
        </div>

        {/* Status badges & Duration */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 text-xs text-slate-300 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{formatDuration(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
              showLogs
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
            }`}
            title="Inspect WebRTC signaling events"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Signaling Logs</span>
          </button>
        </div>
      </header>

      {/* Main Body: Video Area + Drawers */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Video Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col justify-center">
          {/* PRESENTATION SPOTLIGHT MODE (When Screen Share is Active) */}
          {isSomeoneSharing && presenter ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto w-full h-full max-h-[calc(100vh-170px)]">
              {/* Featured Presentation Screen Tile */}
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <VideoTile
                  stream={presenter.stream}
                  name={`${presenter.name}'s Presentation`}
                  isLocal={presenter.isLocal}
                  isMuted={presenter.isLocal ? isAudioMuted : false}
                  isVideoOff={false}
                  isScreenSharing={true}
                  className="w-full h-full max-h-[calc(100vh-190px)] object-contain shadow-2xl"
                />
              </div>

              {/* Side Strip of Camera Feeds */}
              <div className="lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 pb-2">
                {/* Local camera feed */}
                <div className="w-48 lg:w-full shrink-0">
                  <VideoTile
                    stream={localStream}
                    name={user?.name || 'You'}
                    isLocal={true}
                    isMuted={isAudioMuted}
                    isVideoOff={isVideoDisabled}
                    isSpeaking={isSpeaking}
                    tag="You"
                  />
                </div>

                {/* Remote peer feeds */}
                {remotePeers.map((peer) => {
                  const matchedParticipant = participants.find(
                    (p) => p.socketId === peer.socketId
                  );
                  const peerName =
                    matchedParticipant?.name || `Remote Peer (${peer.socketId.slice(0, 5)})`;

                  return (
                    <div key={peer.socketId} className="w-48 lg:w-full shrink-0">
                      <VideoTile
                        stream={peer.stream}
                        name={peerName}
                        isLocal={false}
                        isMuted={matchedParticipant?.isMuted}
                        isVideoOff={matchedParticipant?.isVideoOff}
                        isSpeaking={matchedParticipant?.isSpeaking}
                        tag="Remote"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STANDARD GRID MODE (When No Screen Share is Active) */
            <div className={`grid gap-4 ${getGridClass()}`}>
              {/* Local Video Tile */}
              <VideoTile
                stream={localStream}
                name={user?.name || 'You'}
                isLocal={true}
                isMuted={isAudioMuted}
                isVideoOff={isVideoDisabled}
                isSpeaking={isSpeaking}
                tag="You"
              />

              {/* Remote Peer Video Tiles */}
              {remotePeers.map((peer) => {
                const matchedParticipant = participants.find(
                  (p) => p.socketId === peer.socketId
                );
                const peerName =
                  matchedParticipant?.name || `Remote Peer (${peer.socketId.slice(0, 5)})`;

                return (
                  <VideoTile
                    key={peer.socketId}
                    stream={peer.stream}
                    name={peerName}
                    isLocal={false}
                    isMuted={matchedParticipant?.isMuted}
                    isVideoOff={matchedParticipant?.isVideoOff}
                    isSpeaking={matchedParticipant?.isSpeaking}
                    isScreenSharing={matchedParticipant?.isScreenSharing}
                    tag="Remote"
                  />
                );
              })}
            </div>
          )}

          {/* Empty Peer Hint when waiting */}
          {remotePeers.length === 0 && !isSomeoneSharing && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-xs text-slate-400 flex items-center gap-2 pointer-events-none">
              <Activity className="w-4 h-4 text-brand-400 animate-pulse" />
              <span>
                Waiting for participants to join... Share the room code or invite link
              </span>
            </div>
          )}
        </main>

        {/* Signaling Inspector Drawer */}
        {showLogs && (
          <aside className="w-80 h-full glass-panel border-l border-white/10 p-4 flex flex-col bg-dark-900/95 backdrop-blur-xl z-20 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                WebRTC Signaling
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Live</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {signalingLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No events yet</p>
              ) : (
                signalingLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-dark-900/60 border border-white/5 space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${
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
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Participant Area Drawer */}
        {isParticipantsOpen && (
          <div className="z-20">
            <ParticipantList
              participants={participants}
              currentUserId={user?.id}
              hostId={meetingHostId}
              onClose={() => setIsParticipantsOpen(false)}
            />
          </div>
        )}

        {/* Real-Time Meeting Chat Drawer */}
        {isChatOpen && (
          <div className="z-20">
            <ChatPanel
              messages={messages}
              currentUserId={user?.id}
              onSendMessage={sendMessage}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {/* Real-Time Meeting Transcript Drawer */}
        {isTranscriptOpen && (
          <div className="z-20">
            <TranscriptPanel
              isOpen={isTranscriptOpen}
              onClose={() => setIsTranscriptOpen(false)}
              segments={segments}
              isTranscribing={isTranscribing}
              onToggleTranscription={toggleTranscription}
              providerName={providerName}
              onClearTranscript={clearTranscript}
            />
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <footer className="p-4 flex items-center justify-center z-20">
        <MeetingControls
          isMuted={isAudioMuted}
          isVideoOff={isVideoDisabled}
          isScreenSharing={isScreenSharing}
          isSpeaking={isSpeaking}
          isParticipantsOpen={isParticipantsOpen}
          isChatOpen={isChatOpen}
          isTranscriptOpen={isTranscriptOpen}
          isTranscribing={isTranscribing}
          transcriptSegmentCount={segments.length}
          participantCount={participants.length}
          unreadCount={unreadCount}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleParticipants={handleToggleParticipants}
          onToggleChat={handleToggleChat}
          onToggleTranscript={handleToggleTranscript}
          isHost={isHost}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeave}
        />
      </footer>
    </div>
  );
};
