import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Video, Sparkles, LogOut, LayoutDashboard, Building2, CheckSquare, Camera, Loader2 } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, uploadAvatar } = useAuth();
  const navigate = useNavigate();
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please select a valid image file (PNG, JPEG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image must be smaller than 5MB.');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      await uploadAvatar(file);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload avatar to Cloudinary');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 sm:px-8 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-glow-brand group-hover:scale-105 transition-transform duration-200">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            IntellMeet
            <Sparkles className="w-3.5 h-3.5 text-brand-400 fill-brand-400" />
          </span>
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
                to="/tasks"
                className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Tasks</span>
              </Link>
              <Link
                to="/workspaces"
                className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Workspaces</span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center space-x-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              {/* Real-time Notification Bell */}
              <NotificationDropdown />

              {/* User badge with Cloudinary avatar upload */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title="Click to change profile avatar (Cloudinary)"
                  className="relative group focus:outline-none"
                >
                  <Avatar size="sm" className="ring-1 ring-white/10 group-hover:ring-brand-500 transition-all">
                    {isUploadingAvatar ? (
                      <div className="flex h-full w-full items-center justify-center bg-brand-600/40">
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      </div>
                    ) : (
                      <AvatarImage
                        src={user?.avatar}
                        alt={user?.name}
                        fallback={<AvatarFallback name={user?.name} />}
                      />
                    )}
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-2.5 h-2.5 text-white" />
                  </div>
                </button>
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
