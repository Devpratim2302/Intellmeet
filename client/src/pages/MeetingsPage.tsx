import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../services/meeting.api';
import { Meeting } from '../types/meeting.types';
import { useAuth } from '../context/AuthContext';
import {
  Video,
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Radio,
  Trash2,
  FileText,
  Sparkles,
  Activity,
} from 'lucide-react';
import { TranscriptViewerModal } from '../components/meeting/TranscriptViewerModal';
import { SummaryActionModal } from '../components/meeting/SummaryActionModal';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTranscriptMeeting, setSelectedTranscriptMeeting] = useState<{
    roomId: string;
    title: string;
  } | null>(null);
  const [selectedSummaryMeeting, setSelectedSummaryMeeting] = useState<{
    roomId: string;
    title: string;
  } | null>(null);

  // New Meeting Form
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Join by Code
  const [quickRoomId, setQuickRoomId] = useState('');
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const data = await meetingApi.getMeetings();
      setMeetings(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch meetings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const newMeeting = await meetingApi.createMeeting({
        title: title.trim(),
        description: description.trim(),
      });
      setMeetings((prev) => [newMeeting, ...prev]);
      setTitle('');
      setDescription('');
      setIsCreating(false);
      navigate(`/meetings/${newMeeting.roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRoomId.trim()) return;
    navigate(`/meetings/${quickRoomId.trim().toLowerCase()}`);
  };

  const handleCopy = (roomId: string) => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(roomId);
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const handleDelete = async (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await meetingApi.deleteMeeting(meetingId);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete meeting');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 mb-3 text-brand-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-brand-400" />
            <span>Development Block 2: Meetings & WebRTC</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Meeting Rooms
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create real-time rooms, manage schedules, and establish WebRTC peer
            connections.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center space-x-2 shadow-glow-brand transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Meeting</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="my-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Join Card & Create Drawer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        {/* Join by Code */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 md:col-span-1">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Video className="w-4 h-4 text-brand-400" />
            Join with Code
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Enter a room identifier to connect directly to the WebRTC signaling session.
          </p>
          <form onSubmit={handleQuickJoin} className="space-y-3">
            <input
              type="text"
              required
              placeholder="e.g. meet-a1b2-c3d4"
              value={quickRoomId}
              onChange={(e) => setQuickRoomId(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Enter Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Create Meeting Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 md:col-span-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Instant Room Setup
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Create an ad-hoc or scheduled meeting room to test audio/video peer exchange.
          </p>
          <form
            onSubmit={handleCreateMeeting}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Daily Standup or WebRTC Peer Test"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief agenda or purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create & Launch Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Meeting Rooms List */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-400" />
          <span>Active & Scheduled Meetings ({meetings.length})</span>
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-3" />
            <p className="text-sm">Loading your meeting rooms...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center">
            <Video className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              No meetings created yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Click "New Meeting" above to start an instant collaboration room and test
              WebRTC peer connections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {meetings.map((meeting) => {
              const isHost =
                meeting.host?.id === user?.id || (meeting.host as any) === user?.id;
              return (
                <div
                  key={meeting.id}
                  onClick={() => navigate(`/meetings/${meeting.roomId}`)}
                  className="glass-card p-5 rounded-2xl border border-white/10 hover:border-brand-500/40 cursor-pointer transition-all hover:-translate-y-0.5 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        meeting.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : meeting.status === 'scheduled'
                            ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {meeting.status}
                    </span>

                    {/* Room ID Copy */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(meeting.roomId);
                        }}
                        className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-1 border border-white/5"
                        title="Copy Room ID"
                      >
                        {copiedRoomId === meeting.roomId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{meeting.roomId}</span>
                      </button>

                      {isHost && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, meeting.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-rose-500/10"
                          title="Delete meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">
                    {meeting.title}
                  </h3>
                  {meeting.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                      {meeting.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Host: {meeting.host?.name || 'You'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTranscriptMeeting({
                            roomId: meeting.roomId,
                            title: meeting.title,
                          });
                        }}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 transition-colors border border-white/5 text-[11px]"
                        title="View meeting transcript"
                      >
                        <FileText className="w-3 h-3 text-indigo-400" />
                        <span>Transcript</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSummaryMeeting({
                            roomId: meeting.roomId,
                            title: meeting.title,
                          });
                        }}
                        className="px-2 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 hover:text-white flex items-center gap-1 transition-colors border border-brand-500/20 text-[11px]"
                        title="View AI summary & action items"
                      >
                        <Sparkles className="w-3 h-3 text-brand-400" />
                        <span>AI Summary</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/meetings/${meeting.roomId}/dashboard`);
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white flex items-center gap-1 transition-colors border border-indigo-500/20 text-[11px]"
                        title="Open Post-Meeting Dashboard"
                      >
                        <Activity className="w-3 h-3 text-indigo-400" />
                        <span>Dashboard</span>
                      </button>

                      <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Join <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transcript Viewer Modal */}
      {selectedTranscriptMeeting && (
        <TranscriptViewerModal
          isOpen={!!selectedTranscriptMeeting}
          onClose={() => setSelectedTranscriptMeeting(null)}
          roomId={selectedTranscriptMeeting.roomId}
          meetingTitle={selectedTranscriptMeeting.title}
        />
      )}

      {/* AI Summary & Action Items Modal */}
      {selectedSummaryMeeting && (
        <SummaryActionModal
          isOpen={!!selectedSummaryMeeting}
          onClose={() => setSelectedSummaryMeeting(null)}
          roomId={selectedSummaryMeeting.roomId}
          meetingTitle={selectedSummaryMeeting.title}
        />
      )}
    </div>
  );
};
