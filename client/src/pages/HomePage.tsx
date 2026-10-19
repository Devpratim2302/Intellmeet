import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col justify-between overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center flex-1 flex flex-col justify-center items-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-10 leading-tight">
          Next-Generation Meetings Powered by{' '}
          <span className="gradient-text">IntellMeet</span>
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
      </main>

      {/* Footer / Status bar */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-slate-500">
        <p>IntellMeet • Team 3 • Phase 1 Foundation & Auth</p>
      </footer>
    </div>
  );
};
