import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User,
  Shield,
  Video,
  Bot,
  CheckCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [apiHealth, setApiHealth] = useState<{
    status: string;
    version: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        setApiHealth(res.data);
      } catch (err) {
        console.warn('API health check error:', err);
      }
    };
    fetchHealth();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-3 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Authenticated Session Active</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Developer'}!
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            IntellMeet Workspace Dashboard • Team 3 Internship Project
          </p>
        </div>

        {/* System Health Status */}
        <div className="flex items-center space-x-3 px-4 py-2.5 rounded-2xl glass-card border border-white/10 text-xs text-slate-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="font-semibold text-white flex items-center gap-1">
              Backend Status: {apiHealth?.status === 'healthy' ? 'Online' : 'Connected'}
            </span>
            <span className="text-[10px] text-slate-400">
              API Version: {apiHealth?.version || '0.1.0'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile & Security Credentials Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                User Profile
              </h2>
              <span className="text-xs text-slate-400">Verified identity</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Name:</span>
              <span className="font-medium text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Email:</span>
              <span className="font-medium text-white">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Role:</span>
              <span className="capitalize font-semibold text-brand-300">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Auth & Security
              </h2>
              <span className="text-xs text-slate-400">JWT Token Session</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Token Type:</span>
              <span className="font-medium text-emerald-400">Bearer JWT</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Token Refresh:</span>
              <span className="font-medium text-slate-200">HTTP-Only Cookie</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Password:</span>
              <span className="font-medium text-emerald-400">Bcrypt (Salt 10)</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Development Stage
              </h2>
              <span className="text-xs text-slate-400">Phase 1 Complete</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Current Phase:</span>
              <span className="font-semibold text-brand-300">Days 1–3 (Auth)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Next Phase:</span>
              <span className="font-medium text-slate-200">Meetings + WebRTC</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Target Date:</span>
              <span className="font-medium text-slate-200">Sep 29–Oct 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next in Project Timeline */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-400" />
          <span>Upcoming Development Blocks</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5 rounded-2xl border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Days 4–6 • Sep 29–Oct 1
              </span>
              <Video className="w-4 h-4 text-brand-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Meetings + WebRTC + Socket.io
            </h3>
            <p className="text-xs text-slate-400">
              Meeting rooms creation, signaling server, peer connections, room state.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Days 7–9 • Oct 2–4
              </span>
              <Video className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Frontend Meeting UI
            </h3>
            <p className="text-xs text-slate-400">
              Video grid, controls (mute/unmute, camera toggle), device selection.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 opacity-60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Days 13–15 • Oct 8–10
              </span>
              <Bot className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              AI Transcription & Intelligence
            </h3>
            <p className="text-xs text-slate-400">
              Speech-to-text pipeline, summary generator, action item extraction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
