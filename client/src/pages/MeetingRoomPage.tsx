import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../context/AuthContext';
import { meetingApi } from '../services/meeting.api';
import { socketService } from '../services/socket.service';
import { summaryApi } from '../services/summary.api';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import { ParticipantList } from '../components/meeting/ParticipantList';
import { ChatPanel } from '../components/meeting/ChatPanel';
import { TranscriptPanel } from '../components/meeting/TranscriptPanel';
import { useMeetingTranscription } from '../hooks/useMeetingTranscription';
import { useMeetingUiStore } from '../stores/meetingUiStore';
import { Copy, Check, Clock, Monitor, Sparkles, PhoneOff, ArrowLeft, Circle, Download } from 'lucide-react';

export const MeetingRoomPage: React.FC = () => {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [meetingTitle, setMeetingTitle] = useState<string>('Meeting Room');
  const [meetingHostId, setMeetingHostId] = useState<string | undefined>();
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isEndedLocally, setIsEndedLocally] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Zustand Store for shared meeting UI preferences & collaboration panels
  const {
    isParticipantsOpen,
    isChatOpen,
    isTranscriptOpen,
    toggleParticipants,
    toggleChat,
    toggleTranscript,
    resetMeetingUi,
  } = useMeetingUiStore();

  // Reset meeting UI on unmount
  useEffect(() => {
    return () => {
      resetMeetingUi();
    };
  }, [resetMeetingUi]);

  // Fetch meeting metadata if available
  useEffect(() => {
    if (roomId) {
      meetingApi
        .getMeeting(roomId)
        .then((m) => {
          setMeetingData(m);
          setMeetingTitle(m.title);
          const rawHost = m.host?.id || (m.host as any)?._id || (m.host as any);
          setMeetingHostId(rawHost ? String(rawHost) : undefined);
          if (m.status === 'completed' || m.status === 'cancelled') {
            setIsEndedLocally(true);
          }
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

  const isEnded = isEndedLocally || meetingData?.status === 'completed' || meetingData?.status === 'cancelled';

  // WebRTC Hook - disabled if meeting has already ended
  const {
    localStream,
    remotePeers,
    participants,
    isConnected,
    isMeetingEnded,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    activeScreenSharePeerId,
    isSpeaking,
    messages,
    unreadCount,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    resetUnreadCount,
  } = useWebRTC(roomId, !isEnded);

  const hasConcluded = isEnded || isMeetingEnded;

  // Stop any active hardware media tracks if meeting ended
  useEffect(() => {
    if (hasConcluded && localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  }, [hasConcluded, localStream]);

  // Meeting Transcription & Recording Hook
  const {
    segments,
    isTranscribing,
    isRecording,
    recordingSeconds,
    hasRecordedAudio,
    toggleTranscription,
    toggleRecording,
    stopAudioCapture,
    clearTranscript,
    downloadAudioRecording,
  } = useMeetingTranscription(roomId, localStream, isAudioMuted);

  const handleDownloadTranscriptNotes = () => {
    let content = `# ${meetingTitle} (${roomId})\n\n`;
    content += `**Host:** ${meetingData?.host?.name || 'Host'}  \n`;
    content += `**Date:** ${new Date().toLocaleString()}  \n`;
    content += `**Status:** Completed  \n\n`;
    content += `---\n\n## Meeting Transcript\n\n`;
    if (segments.length === 0) {
      content += `*No transcript segments recorded for this meeting session.*\n`;
    } else {
      segments.forEach((seg) => {
        const time = seg.timestamp ? `[${new Date(seg.timestamp).toLocaleTimeString()}] ` : '';
        content += `${time}**${seg.speaker?.name || 'Speaker'}:** ${seg.text}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost =
    Boolean(meetingHostId && (meetingHostId === user?.id || meetingHostId === (user as any)?._id));

  const handleEndMeeting = async () => {
    if (window.confirm('End this meeting for all participants and proceed to the post-meeting dashboard?')) {
      if (isRecording) {
        stopAudioCapture();
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      try {
        await meetingApi.updateMeeting(roomId, { status: 'completed' });
      } catch (err) {
        console.warn('Failed to mark meeting completed:', err);
      }
      try {
        await socketService.endMeeting(roomId);
      } catch {
        // ignore
      }
      setIsEndedLocally(true);

      // Trigger AI summary generation in background so it is ready immediately
      summaryApi.generateSummary(roomId).catch(() => {});

      navigate(`/meetings/${roomId}/dashboard`);
    }
  };

  const handleLeave = () => {
    if (isRecording) {
      stopAudioCapture();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    navigate(`/meetings/${roomId}/dashboard`);
  };

  const handleToggleTranscript = () => {
    toggleTranscript();
  };

  const handleToggleChat = () => {
    if (!isChatOpen) {
      resetUnreadCount();
    }
    toggleChat();
  };

  const handleToggleParticipants = () => {
    toggleParticipants();
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const getParticipantDisplayName = (rawName?: string): string => {
    if (!rawName) return 'You';
    if (rawName === 'Project Mentor (Evaluator)' || rawName.includes('Project Mentor') || rawName.includes('Mentor')) {
      return 'Demo Admin';
    }
    return rawName;
  };

  // Determine if anyone in the call is currently presenting
  const isSomeoneSharing = isScreenSharing || !!activeScreenSharePeerId;

  // Find presenter information
  const presenter = isScreenSharing
    ? { isLocal: true, name: getParticipantDisplayName(user?.name), stream: localStream }
    : activeScreenSharePeerId
      ? {
          isLocal: false,
          name:
            getParticipantDisplayName(
              participants.find((p) => p.socketId === activeScreenSharePeerId)?.name
            ) || 'Presenter',
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

  if (hasConcluded) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-dark-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-lg w-full glass-card p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl text-center flex flex-col items-center">
          {/* Icon with glowing pulse */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
              <PhoneOff className="w-10 h-10" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-dark-900 border border-rose-500/40 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              Ended
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            This Meeting Has Ended
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The session has concluded. Re-joining the live call is disabled, but all transcripts, recordings, and AI-generated notes are ready.
          </p>

          {/* Meeting Details Box */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Meeting Title</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{meetingTitle}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Room Code</span>
              <span className="font-mono text-brand-300 font-semibold">{roomId}</span>
            </div>
            {meetingData?.host?.name && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Host</span>
                <span className="text-slate-200">{meetingData.host.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Completed
              </span>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="w-full space-y-3">
            <Link
              to={`/meetings/${roomId}/dashboard`}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span>View Post-Meeting Dashboard & Summary</span>
            </Link>

            {hasRecordedAudio && (
              <button
                type="button"
                onClick={() => downloadAudioRecording()}
                className="w-full py-3 px-5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 font-semibold text-sm border border-emerald-500/40 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Meeting Audio (.webm)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadTranscriptNotes}
              className="w-full py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-medium text-sm border border-white/10 flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4 text-brand-400" />
              <span>Download Meeting Notes & Transcript (.md)</span>
            </button>

            <Link
              to="/meetings"
              className="w-full py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm border border-white/10 flex items-center justify-center space-x-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Meetings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Active Screen Share Notice in Header */}
          {isSomeoneSharing && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
              <Monitor className="w-3.5 h-3.5" />
              <span>{presenter?.name} is sharing screen</span>
            </div>
          )}

          {/* Active Live Transcription & Recording Notice in Header */}
          {isRecording ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs shadow-lg shadow-rose-500/10">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400 font-mono uppercase tracking-wider">REC</span>
              <span className="font-mono text-white font-semibold">
                {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                {(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="hidden sm:inline text-slate-300">• Live Transcribing ({segments.length})</span>
              <button
                type="button"
                onClick={toggleRecording}
                className="ml-1 text-[11px] font-semibold underline text-rose-300 hover:text-white"
                title="Stop recording"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleRecording}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs transition-all shadow-sm"
              title="Start recording meeting audio and speech transcript"
            >
              <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
              <span className="font-semibold">Start Recording</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors border border-white/5 group"
            title="Copy meeting code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-mono font-medium">Copied Code!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                <span className="font-mono text-slate-300 group-hover:text-white transition-colors">{roomId}</span>
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
                    name={getParticipantDisplayName(user?.name)}
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
                  const peerName = getParticipantDisplayName(
                    matchedParticipant?.name || `Remote Peer (${peer.socketId.slice(0, 5)})`
                  );

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
                name={getParticipantDisplayName(user?.name)}
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
                const peerName = getParticipantDisplayName(
                  matchedParticipant?.name || `Remote Peer (${peer.socketId.slice(0, 5)})`
                );

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


        </main>



        {/* Participant Area Drawer */}
        {isParticipantsOpen && (
          <div className="z-20">
            <ParticipantList
              participants={participants}
              currentUserId={user?.id}
              hostId={meetingHostId}
              onClose={toggleParticipants}
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
              onClose={toggleChat}
            />
          </div>
        )}

        {/* Real-Time Meeting Transcript Drawer */}
        {isTranscriptOpen && (
          <div className="z-20">
            <TranscriptPanel
              isOpen={isTranscriptOpen}
              onClose={toggleTranscript}
              segments={segments}
              isTranscribing={isTranscribing}
              onToggleTranscription={toggleTranscription}
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
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          onToggleRecording={toggleRecording}
          isParticipantsOpen={isParticipantsOpen}
          isChatOpen={isChatOpen}
          isTranscriptOpen={isTranscriptOpen}
          isTranscribing={isTranscribing}
          transcriptSegmentCount={segments.length}
          participantCount={Math.max(participants.length, 1 + remotePeers.length)}
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
