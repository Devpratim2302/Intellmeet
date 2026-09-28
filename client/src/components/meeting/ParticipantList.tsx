import React from 'react';
import { X, Users, Crown, Shield } from 'lucide-react';
import { RoomParticipant } from '../../types/meeting.types';

export interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId?: string;
  hostId?: string;
  onClose: () => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  hostId,
  onClose,
}) => {
  return (
    <div className="w-80 h-full glass-panel border-l border-white/10 flex flex-col bg-dark-900/95 backdrop-blur-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Participants ({participants.length})
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close participants"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {participants.map((p) => {
          const isYou = p.userId === currentUserId;
          const isHost = p.userId === hostId || p.role === 'admin';

          return (
            <div
              key={p.socketId}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center space-x-3 truncate">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xs shrink-0">
                  {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-semibold text-white truncate">
                      {p.name}
                    </span>
                    {isYou && (
                      <span className="text-[10px] text-brand-400 font-medium shrink-0">
                        (You)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {p.email}
                  </span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center space-x-1 shrink-0 ml-2">
                {isHost && (
                  <span
                    className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    title="Host / Admin"
                  >
                    <Crown className="w-3 h-3" />
                  </span>
                )}
                <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        <span>End-to-end encrypted WebRTC session</span>
      </div>
    </div>
  );
};
