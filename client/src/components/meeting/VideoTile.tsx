import React, { useEffect, useRef } from 'react';
import { MicOff, User, Monitor, Volume2 } from 'lucide-react';

export interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  tag?: string;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isSpeaking = false,
  isScreenSharing = false,
  tag,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      if (!isVideoOff) {
        videoEl.play().catch(() => {});
      }
    }
  }, [stream, isVideoOff]);

  // Speaking state only active if not muted
  const activeSpeaking = isSpeaking && !isMuted;

  return (
    <div
      className={`relative glass-card rounded-2xl overflow-hidden border bg-dark-900/90 flex items-center justify-center aspect-video min-h-[200px] sm:min-h-[260px] shadow-lg transition-all duration-300 ${
        activeSpeaking
          ? 'border-emerald-500/80 ring-2 ring-emerald-400/80 ring-offset-2 ring-offset-dark-950 shadow-emerald-500/20 shadow-xl'
          : isScreenSharing
            ? 'border-blue-500/60 ring-1 ring-blue-500/30'
            : 'border-white/10'
      } ${className}`}
    >
      {/* Video Element - kept in DOM so stream connection is never lost on mute/toggle */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
            if (!isVideoOff) {
              el.play().catch(() => {});
            }
          }
        }}
        autoPlay
        playsInline
        muted={isLocal} // always mute local audio to avoid feedback loop
        className={`w-full h-full object-contain bg-black/60 ${
          isLocal && !isScreenSharing ? 'transform -scale-x-100' : ''
        } ${!stream || isVideoOff ? 'hidden' : 'block'}`}
      />

      {/* Video Off Avatar Placeholder */}
      {(!stream || isVideoOff) && (
        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shadow-glow-brand transition-all ${
              activeSpeaking
                ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300'
                : 'bg-brand-500/15 border border-brand-500/30 text-brand-300'
            }`}
          >
            {name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <span className="text-xs text-slate-400 font-medium">Camera is off</span>
        </div>
      )}

      {/* Participant Name Badge (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-xs font-medium text-white flex items-center gap-2 max-w-[80%] truncate">
        <span className="truncate">{name}</span>
        {isLocal && <span className="text-slate-400 text-[10px]">(You)</span>}
        {activeSpeaking && (
          <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
        )}
        {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
      </div>

      {/* Screen Sharing / Custom Tag (Top-Right) */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5">
        {isScreenSharing && (
          <div className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono border border-blue-500/30 flex items-center gap-1 shadow-sm">
            <Monitor className="w-3 h-3" />
            <span>Screen</span>
          </div>
        )}

        {tag && !isScreenSharing && (
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
            {tag}
          </div>
        )}
      </div>
    </div>
  );
};
