import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { ChatMessage } from '../../types/meeting.types';

export interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (content: string) => Promise<any>;
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSubmitting) return;

    if (trimmed.length > 2000) {
      setErrorMessage('Message cannot exceed 2000 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await onSendMessage(trimmed);
      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 sm:w-96 h-full glass-panel border-l border-white/10 flex flex-col bg-dark-900/95 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Meeting Chat
          </h2>
          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono">
            {messages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-10 h-10 text-slate-600 mb-2 opacity-60" />
            <p className="text-xs font-medium text-slate-400">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Send a message to everyone in this meeting room
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isYou = msg.sender.userId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isYou ? 'items-end' : 'items-start'
                } group transition-all`}
              >
                {/* Sender info & timestamp */}
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-medium text-slate-300">
                    {isYou ? 'You' : msg.sender.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-md transition-all ${
                    isYou
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-white/10 text-slate-100 border border-white/5 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error notification if sending failed */}
      {errorMessage && (
        <div className="mx-4 mb-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/10 bg-dark-950/60 flex flex-col space-y-2"
      >
        <div className="relative flex items-center">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Enter to send)..."
            rows={2}
            maxLength={2000}
            className="w-full resize-none rounded-xl bg-dark-900 border border-white/10 px-3 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-sans"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className={`absolute right-2 bottom-2.5 p-1.5 rounded-lg transition-all ${
              inputText.trim() && !isSubmitting
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow-brand'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-end text-[10px] text-slate-500 px-1">
          <span>{inputText.length}/2000</span>
        </div>
      </form>
    </div>
  );
};
