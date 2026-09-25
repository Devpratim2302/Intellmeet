import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ArrowRight,
  Bot,
  Users,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col justify-between overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        {/* Phase Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/25 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
            Phase 1: Foundation & Authentication Active
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Next-Generation Meetings Powered by{' '}
          <span className="gradient-text">AI Intelligence</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          IntellMeet unifies enterprise HD video conferencing, real-time speech
          transcription, automated summarization, and collaborative task
          execution.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-glow-brand transition-all transform hover:-translate-y-0.5"
            >
              <span>Go to Workspace Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-glow-brand transition-all transform hover:-translate-y-0.5"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl glass-card hover:bg-white/10 text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all border border-white/10"
              >
                <span>Sign In with Credentials</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-brand-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Secure JWT Auth</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enterprise-grade authentication with bcrypt password hashing, token
              rotation, HTTP-only refresh cookies, and rate limiting.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-brand-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">AI Intelligence</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automated speech-to-text transcription, AI summaries, and smart
              action item extraction scheduled for Phase 5 & 6.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-brand-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Team Workspaces</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built for engineering and product teams with shared rooms,
              presence, meeting transcripts, and action logs.
            </p>
          </div>
        </div>
      </main>

      {/* Footer / Status bar */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500">
        <p>IntellMeet • Team 3 • Phase 1 Foundation & Auth</p>
      </footer>
    </div>
  );
};
