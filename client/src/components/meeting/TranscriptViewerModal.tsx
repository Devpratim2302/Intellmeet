import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  X,
  Copy,
  Check,
  Download,
  Loader2,
  Clock,
  Search,
} from 'lucide-react';
import { transcriptApi } from '../../services/transcript.api';
import { Transcript, TranscriptSegment } from '../../types/transcript.types';

export interface TranscriptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  meetingTitle: string;
}

export const TranscriptViewerModal: React.FC<TranscriptViewerModalProps> = ({
  isOpen,
  onClose,
  roomId,
  meetingTitle,
}) => {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !roomId) return;

    setIsLoading(true);
    setError(null);

    transcriptApi
      .getTranscript(roomId)
      .then((res) => {
        setTranscript(res.transcript);
        setSegments(res.segments || []);
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || 'Failed to load transcript');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const filteredSegments = segments.filter(
    (seg) =>
      seg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seg.speaker.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = () => {
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

  const handleDownload = () => {
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
    link.download = `${meetingTitle.replace(/\s+/g, '_')}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{meetingTitle}</span>
                {transcript?.provider && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {transcript.provider}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Room ID: <span className="font-mono text-slate-300">{roomId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              disabled={segments.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Copy transcript"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              disabled={segments.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Download transcript (.txt)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        {segments.length > 2 && (
          <div className="p-3 border-b border-white/5 bg-dark-950/30">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search spoken dialogue or speaker name..."
                className="w-full pl-9 pr-4 py-2 bg-dark-800/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              <p className="text-xs">Loading meeting transcript from database...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-400 text-xs">
              <p>{error}</p>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {segments.length === 0 ? 'No transcript recorded yet' : 'No matching dialogue'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {segments.length === 0
                  ? 'Audio was not transcribed or recorded during this meeting session. Transcripts appear here when transcription is active.'
                  : 'Try searching for different keywords or speaker names.'}
              </p>
            </div>
          ) : (
            filteredSegments.map((segment, idx) => (
              <div
                key={segment.id || `view-seg-${idx}`}
                className="p-3.5 rounded-2xl bg-dark-800/70 border border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold uppercase">
                      {segment.speaker.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-200">
                      {segment.speaker.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                    {segment.confidence && (
                      <span className="font-mono text-slate-400">
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(segment.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-slate-100 text-[13px] pl-8 leading-relaxed">
                  {segment.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-dark-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
