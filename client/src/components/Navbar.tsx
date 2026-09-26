import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, Sparkles, LogOut, LayoutDashboard, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 sm:px-8 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform duration-200">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              IntellMeet
              <Sparkles className="w-3.5 h-3.5 text-brand-400 fill-brand-400" />
            </span>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
              Team 3 Edition
            </span>
          </div>
        </Link>

        {/* Right Nav */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link
                to="/meetings"
                className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <Video className="w-4 h-4 text-brand-400" />
                <span className="hidden sm:inline">Meetings</span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Workspace</span>
              </Link>

              {/* User badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-xs font-bold text-brand-300">
                  {user?.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-lg shadow-glow-brand transition-all transform hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
