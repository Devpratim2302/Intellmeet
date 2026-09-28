import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';

export interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  tag?: string;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  tag,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative glass-card rounded-2xl overflow-hidden border border-white/10 bg-dark-900/90 flex items-center justify-center aspect-video min-h-[200px] sm:min-h-[260px] shadow-lg transition-all ${className}`}
    >
      {/* Video Element */}
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // always mute local audio to avoid feedback loop
          className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        /* Video Off Avatar Placeholder */
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold text-xl shadow-glow-brand">
            {name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <span className="text-xs text-slate-400 font-medium">Camera is off</span>
        </div>
      )}

      {/* Participant Name Badge (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-medium text-white flex items-center gap-2 max-w-[80%] truncate">
        <span className="truncate">{name}</span>
        {isLocal && <span className="text-slate-400 text-[10px]">(You)</span>}
        {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
      </div>

      {/* Tag / Role Badge (Top-Right) */}
      {tag && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
          {tag}
        </div>
      )}
    </div>
  );
};
