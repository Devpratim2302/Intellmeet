import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/notification.api';
import { socketService } from '../services/socket.service';
import { NotificationItem } from '../types/notification.types';
import {
  Bell,
  Check,
  CheckSquare,
  Video,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationApi.getNotifications({ limit: 30 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time notifications over Socket.io
    const socket = socketService.getSocket();
    const handleNewNotification = (newNotif: NotificationItem) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      setToastNotification(newNotif);

      // Auto-dismiss toast after 5 seconds
      setTimeout(() => {
        setToastNotification((current) => (current?.id === newNotif.id ? null : current));
      }, 5000);
    };

    socket.on('notification:new', handleNewNotification);

    // Refresh notifications when tab regains focus
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);

    // Listen to local refresh event (dispatched on task/meeting creation)
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener('notification:refresh', handleRefresh);

    // Background interval check every 15s to keep unread badges strictly accurate
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      socket.off('notification:new', handleNewNotification);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notification:refresh', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'task_created':
      case 'task_status_changed':
        return <CheckSquare className="w-4 h-4 text-amber-400" />;
      case 'meeting_scheduled':
      case 'meeting_reminder':
      case 'meeting_ended':
        return <Video className="w-4 h-4 text-blue-400" />;
      case 'summary_ready':
        return <Sparkles className="w-4 h-4 text-brand-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full ring-1 ring-dark-950 shadow-sm leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl glass-panel border border-white/10 shadow-2xl z-50 overflow-hidden animate-fade-in backdrop-blur-xl">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors hover:bg-white/5 relative group ${
                    !notif.read ? 'bg-brand-500/[0.04]' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white/5 shrink-0 mt-0.5 border border-white/5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-semibold leading-snug truncate ${
                          !notif.read ? 'text-white font-bold' : 'text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-brand-400 font-semibold mt-1.5 group-hover:underline">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center space-y-2 shrink-0">
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating In-App Toast for Real-time Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full glass-panel border border-brand-500/40 p-4 rounded-2xl shadow-2xl shadow-brand-500/20 flex items-start space-x-3 animate-slide-up bg-dark-900/95 backdrop-blur-xl">
          <div className="p-2 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30 shrink-0">
            {getNotificationIcon(toastNotification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white truncate">
              {toastNotification.title}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
              {toastNotification.message}
            </p>
            {toastNotification.link && (
              <button
                type="button"
                onClick={() => {
                  setToastNotification(null);
                  navigate(toastNotification.link!);
                }}
                className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <span>Check it out</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
