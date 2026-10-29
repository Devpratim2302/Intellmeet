import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingApi, CreateMeetingPayload } from '../services/meeting.api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Video, Calendar, ArrowLeft, Sparkles, Clock, AlertCircle } from 'lucide-react';

export const CreateMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMeetingMutation = useMutation({
    mutationFn: (payload: CreateMeetingPayload) => meetingApi.createMeeting(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      window.dispatchEvent(new CustomEvent('notification:refresh'));
      navigate(`/meetings/${data.roomId}`);
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          'Failed to create meeting'
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Meeting title is required');
      return;
    }

    const payload: CreateMeetingPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduledStartTime:
        isScheduled && scheduledStartTime
          ? new Date(scheduledStartTime).toISOString()
          : undefined,
      scheduledEndTime:
        isScheduled && scheduledEndTime
          ? new Date(scheduledEndTime).toISOString()
          : undefined,
    };

    createMeetingMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-glow-brand">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create a Meeting
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up an instant room or schedule an upcoming team call
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Meeting Title *"
            required
            placeholder="e.g. Weekly Product Sync or WebRTC Verification"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide agenda or notes for attendees..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
            />
          </div>

          {/* Instant vs Scheduled Switch */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-sm font-semibold text-white block">
                    Schedule for Later
                  </span>
                  <span className="text-xs text-slate-400">
                    Set specific start and end times
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-brand-500 rounded bg-dark-900 border-white/20 focus:ring-brand-500"
              />
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-white/5">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  icon={<Clock className="w-4 h-4" />}
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  icon={<Clock className="w-4 h-4" />}
                  value={scheduledEndTime}
                  onChange={(e) => setScheduledEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <Link to="/dashboard">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMeetingMutation.isPending}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {isScheduled ? 'Schedule Meeting' : 'Start Instant Meeting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
