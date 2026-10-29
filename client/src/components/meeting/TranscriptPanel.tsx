import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  X,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  Mic,
  Radio,
  Search,
} from 'lucide-react';
import { TranscriptSegment } from '../../types/transcript.types';
import { useAuth } from '../../context/AuthContext';

export interface TranscriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  segments: TranscriptSegment[];
  isTranscribing: boolean;
  onToggleTranscription: () => void;
  onClearTranscript?: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  isOpen,
  onClose,
  segments,
  isTranscribing,
  onToggleTranscription,
  onClearTranscript,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new segments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments.length]);

  if (!isOpen) return null;

  const filteredSegments = segments.filter(
    (seg) =>
      seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seg.speaker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyTranscript = () => {
    if (segments.length === 0) return;
    const text = segments
      .map(
        (s) =>
          `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.speaker.name}: ${s.text}`
      )
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTranscript = () => {
    if (segments.length === 0) return;
    const text = segments
      .map(
        (s) =>
          `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.speaker.name}: ${s.text}`
      )
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full sm:w-96 flex flex-col h-full bg-dark-900/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl relative z-30 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark-950/40">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm">Live Transcript</h3>
              {isTranscribing && (
                <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-2.5 bg-dark-900/70 border-b border-white/5 flex items-center justify-between text-xs">
        {/* Toggle Transcription Button */}
        <button
          onClick={onToggleTranscription}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
            isTranscribing
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30'
          }`}
          title={isTranscribing ? 'Stop live audio transcription' : 'Start live audio transcription'}
        >
          {isTranscribing ? (
            <>
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              <span>Stop AI STT</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              <span>Start Transcribe</span>
            </>
          )}
        </button>

        {/* Copy / Export Actions */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopyTranscript}
            disabled={segments.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Copy full transcript"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownloadTranscript}
            disabled={segments.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Download transcript (.txt)"
          >
            <Download className="w-4 h-4" />
          </button>

          {onClearTranscript && segments.length > 0 && (
            <button
              onClick={onClearTranscript}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear transcript"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {segments.length > 3 && (
        <div className="px-4 py-2 border-b border-white/5 bg-dark-950/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-8 pr-3 py-1.5 bg-dark-800/80 border border-white/10 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      )}

      {/* Segments Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-x-0 space-y-3">
        {filteredSegments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-200 mb-1">
              {segments.length === 0 ? 'No speech transcribed yet' : 'No matching results'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {segments.length === 0
                ? isTranscribing
                  ? 'Listening for speech audio chunks. Spoken words will appear here automatically.'
                  : 'Click "Start Transcribe" to begin recording and converting meeting audio into text.'
                : 'Try adjusting your search query.'}
            </p>
          </div>
        ) : (
          filteredSegments.map((segment, idx) => {
            const isLocal =
              segment.speaker.id === user?.id ||
              segment.speaker.name === user?.name;

            return (
              <div
                key={segment.id || `seg-${idx}`}
                className="group p-3 rounded-xl bg-dark-800/60 border border-white/5 hover:border-white/15 transition-all text-xs space-y-1.5 shadow-sm"
              >
                {/* Speaker info & Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const speakerClean =
                        segment.speaker.name === 'Project Mentor (Evaluator)' ||
                        segment.speaker.name?.includes('Mentor')
                          ? 'Demo Admin'
                          : segment.speaker.name;
                      return (
                        <>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm">
                            {speakerClean.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-200">
                            {speakerClean}
                          </span>
                        </>
                      );
                    })()}
                    {isLocal && (
                      <span className="px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 text-[10px] font-medium border border-brand-500/30">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                    {segment.confidence && (
                      <span className="text-[9px] text-slate-400 font-mono">
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    )}
                    <span>
                      {new Date(segment.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Spoken Text */}
                <p className="text-slate-100 leading-relaxed text-[13px] pl-8">
                  {segment.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 bg-dark-950/60 text-center text-[11px] text-slate-400">
        <span>
          {segments.length} segment{segments.length !== 1 ? 's' : ''} recorded in MongoDB
        </span>
      </div>
    </aside>
  );
};
