import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { meetingApi } from '../services/meeting.api';
import { Meeting } from '../types/meeting.types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Video,
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Copy,
  Check,
  Trash2,
  Loader2,
  Radio,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // TanStack Query for fetching real meetings from API
  const {
    data: meetings = [],
    isLoading,
    isError,
    error,
  } = useQuery<Meeting[]>({
    queryKey: ['meetings'],
    queryFn: meetingApi.getMeetings,
    refetchInterval: 10000, // auto-refresh meetings every 10s
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (meetingId: string) => meetingApi.deleteMeeting(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const handleCopy = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomId);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      deleteMutation.mutate(meetingId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-3 text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Workspace Active</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back,{' '}
            {user?.name === 'Project Mentor (Evaluator)' || user?.name?.includes('Mentor')
              ? 'Demo Admin'
              : user?.name || 'Developer'}
            !
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            IntellMeet Workspace • AI-Powered Enterprise Meeting & Collaboration Platform
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Link to="/meetings/join">
            <Button variant="secondary" size="md">
              Join with Code
            </Button>
          </Link>
          <Link to="/meetings/create">
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
              New Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* 3 Action Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/meetings/create"
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-brand-500/40 transition-all hover:-translate-y-1 group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-brand-500/25 transition-colors shadow-glow-brand">
              <Video className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Instant Meeting</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Launch a zero-setup WebRTC room immediately and invite team members with a
              1-click link.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-brand-400 group-hover:text-brand-300">
            <span>Start now</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/meetings/join"
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-indigo-500/40 transition-all hover:-translate-y-1 group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/25 transition-colors shadow-glow-purple">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Join by Code</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter an existing room code with a pre-call camera & microphone preview
              test.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Enter room</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/meetings/create"
          className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/25 transition-colors">
              <Calendar className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Schedule Call</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plan future standups, sprint reviews, or architecture discussions with
              scheduled times.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-purple-400 group-hover:text-purple-300">
            <span>Schedule</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Real Meetings Feed (TanStack Query) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-brand-400" />
            <span>Your Meeting Rooms ({meetings.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Auto-synced</span>
        </div>

        {isLoading ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-3" />
            <p className="text-sm text-slate-400">Loading your meeting rooms...</p>
          </div>
        ) : isError ? (
          <div className="glass-panel p-8 rounded-3xl border border-rose-500/30 text-rose-300 text-sm">
            {(error as any)?.message || 'Failed to load meetings'}
          </div>
        ) : meetings.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-400">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                No active meeting rooms yet
              </h3>
            </div>
            <Link to="/meetings/create">
              <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                Create Meeting Room
              </Button>
            </Link>
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
                  className="glass-card p-6 rounded-3xl border border-white/10 hover:border-brand-500/40 cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Top Row: Status badge & Room Code */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant={
                          meeting.status === 'active'
                            ? 'success'
                            : meeting.status === 'scheduled'
                              ? 'brand'
                              : 'neutral'
                        }
                      >
                        {meeting.status}
                      </Badge>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(meeting.roomId, e)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1 border border-white/5 transition-colors"
                          title="Copy Room ID"
                        >
                          {copiedId === meeting.roomId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{meeting.roomId}</span>
                        </button>

                        {isHost && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(meeting.id, e)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete meeting"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-brand-300 transition-colors">
                      {meeting.title}
                    </h3>

                    {meeting.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/meetings/${meeting.roomId}/dashboard`);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                        title="View post-meeting dashboard"
                      >
                        Dashboard
                      </button>
                      <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Join Room <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
