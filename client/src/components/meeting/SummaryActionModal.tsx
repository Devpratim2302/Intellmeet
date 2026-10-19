import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  Loader2,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertCircle,
  Tag,
  CheckSquare,
} from 'lucide-react';
import { summaryApi } from '../../services/summary.api';
import { MeetingSummary, ActionItem, ActionItemPriority } from '../../types/summary.types';

export interface SummaryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  meetingTitle: string;
}

export const SummaryActionModal: React.FC<SummaryActionModalProps> = ({
  isOpen,
  onClose,
  roomId,
  meetingTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'actions'>('summary');
  const [summary, setSummary] = useState<MeetingSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // New action item form state
  const [isAddingTask, setIsAddingTask] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<ActionItemPriority>('medium');

  const fetchData = async () => {
    if (!isOpen || !roomId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [sum, items] = await Promise.all([
        summaryApi.getSummary(roomId),
        summaryApi.getActionItems(roomId),
      ]);
      setSummary(sum);
      setActionItems(items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await summaryApi.generateSummary(roomId);
      setSummary(result.summary);
      setActionItems(result.actionItems || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate AI summary. Ensure the transcript has content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTaskStatus = async (item: ActionItem) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await summaryApi.updateActionItem(roomId, item.id, {
        status: nextStatus,
      });
      setActionItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update action item');
    }
  };

  const handleDeleteTask = async (itemId: string) => {
    try {
      await summaryApi.deleteActionItem(roomId, itemId);
      setActionItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete action item');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await summaryApi.createActionItem(roomId, {
        title: newTitle.trim(),
        assigneeName: newAssignee.trim() || undefined,
        dueDate: newDueDate || undefined,
        priority: newPriority,
      });
      setActionItems((prev) => [created, ...prev]);
      setNewTitle('');
      setNewAssignee('');
      setNewDueDate('');
      setIsAddingTask(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create action item');
    }
  };

  const handleCopy = () => {
    if (!summary && actionItems.length === 0) return;

    const sections: string[] = [`# AI Meeting Summary: ${meetingTitle}\n`];
    if (summary) {
      sections.push(`## Overview\n${summary.overview}\n`);
      if (summary.keyPoints?.length > 0) {
        sections.push(`## Key Discussion Points\n${summary.keyPoints.map((k) => `- ${k}`).join('\n')}\n`);
      }
      if (summary.decisions?.length > 0) {
        sections.push(`## Decisions\n${summary.decisions.map((d) => `- ${d}`).join('\n')}\n`);
      }
      if (summary.topics?.length > 0) {
        sections.push(`## Topics: ${summary.topics.join(', ')}\n`);
      }
    }

    if (actionItems.length > 0) {
      sections.push(`## Action Items\n${actionItems.map((a) => `- [${a.status === 'completed' ? 'x' : ' '}] ${a.title} ${a.assigneeName ? `(@${a.assigneeName})` : ''} ${a.dueDate ? `[Due: ${a.dueDate.slice(0, 10)}]` : ''}`).join('\n')}`);
    }

    navigator.clipboard.writeText(sections.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary && actionItems.length === 0) return;

    const content = [
      `# AI Meeting Summary: ${meetingTitle}`,
      `Room ID: ${roomId}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `\n## Overview\n${summary?.overview || 'No overview generated.'}`,
      `\n## Key Discussion Points\n${summary?.keyPoints?.map((k) => `- ${k}`).join('\n') || 'None'}`,
      `\n## Decisions\n${summary?.decisions?.map((d) => `- ${d}`).join('\n') || 'None recorded'}`,
      `\n## Action Items\n${actionItems.map((a) => `- [${a.status === 'completed' ? 'x' : ' '}] ${a.title} (Assignee: ${a.assigneeName || 'Unassigned'}) [Priority: ${a.priority}]`).join('\n') || 'None'}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingTitle.replace(/\s+/g, '_')}_AI_Summary.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{meetingTitle}</span>
                {summary?.provider && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {summary.provider} AI
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                AI Meeting Summary & Action-Item Extraction
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
              title="Generate or update AI summary from transcript"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{summary ? 'Regenerate' : 'Generate AI'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              disabled={!summary && actionItems.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Copy Summary & Tasks"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              disabled={!summary && actionItems.length === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="Download as Markdown"
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

        {/* Tab navigation */}
        <div className="px-5 pt-3 border-b border-white/5 bg-dark-950/20 flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span>Action Items ({actionItems.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
              <p className="text-xs">Loading summary and extracted action items...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold">Unable to generate summary</p>
                <p className="text-rose-200/80 mt-0.5">{error}</p>
              </div>
            </div>
          ) : activeTab === 'summary' ? (
            !summary ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-brand-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  No summary generated yet
                </p>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Click the "Generate AI" button above to analyze the recorded meeting transcript and produce an executive summary with discussion points and decisions.
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Summary</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview */}
                <div className="p-5 rounded-2xl bg-dark-800/60 border border-white/5 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Concise Overview</span>
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {summary.overview}
                  </p>
                </div>

                {/* Key Discussion Points */}
                {summary.keyPoints?.length > 0 && (
                  <div className="p-5 rounded-2xl bg-dark-800/60 border border-white/5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Key Discussion Points
                    </h3>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Identified Decisions */}
                <div className="p-5 rounded-2xl bg-dark-800/60 border border-white/5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Decisions Reached</span>
                  </h3>
                  {summary.decisions?.length > 0 ? (
                    <ul className="space-y-2">
                      {summary.decisions.map((dec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start space-x-2.5 text-xs text-slate-200 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{dec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No explicit consensus or decisions were identified in the transcript.
                    </p>
                  )}
                </div>

                {/* Important Topics */}
                {summary.topics?.length > 0 && (
                  <div className="p-5 rounded-2xl bg-dark-800/60 border border-white/5 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Important Topics</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Action Items Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Extracted Action Items</h3>
                  <p className="text-xs text-slate-400">
                    Track and assign follow-ups identified by AI from the meeting.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              {/* Add Task Form */}
              {isAddingTask && (
                <form
                  onSubmit={handleCreateTask}
                  className="p-4 rounded-2xl bg-dark-800 border border-white/10 space-y-3 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">New Action Item</h4>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task description..."
                    required
                    className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      placeholder="Assignee name..."
                      className="px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as ActionItemPriority)}
                      className="px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              {/* Action items list */}
              {actionItems.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <CheckSquare className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-300">No action items identified</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Generate an AI summary to extract tasks, or click "Add Task" to record one manually.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.status === 'completed'
                          ? 'bg-dark-950/40 border-emerald-500/20 opacity-70'
                          : 'bg-dark-800/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 flex-1">
                          <button
                            onClick={() => handleToggleTaskStatus(item)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                            title={item.status === 'completed' ? 'Mark pending' : 'Mark completed'}
                          >
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>

                          <div className="space-y-1 flex-1">
                            <h4
                              className={`text-xs font-semibold ${
                                item.status === 'completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-100'
                              }`}
                            >
                              {item.title}
                            </h4>

                            {item.description && (
                              <p className="text-[11px] text-slate-400">{item.description}</p>
                            )}

                            {/* Snippet quote */}
                            {item.sourceSnippet && (
                              <p className="text-[10px] text-slate-400 font-mono italic pl-2 border-l-2 border-brand-500/40 mt-1">
                                "{item.sourceSnippet}"
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
                              {item.assigneeName && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-300">
                                  <User className="w-3 h-3 text-brand-400" />
                                  <span>{item.assigneeName}</span>
                                </span>
                              )}

                              {item.dueDate && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-300">
                                  <Calendar className="w-3 h-3 text-indigo-400" />
                                  <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                                </span>
                              )}

                              <span
                                className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                                  item.priority === 'high'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    : item.priority === 'low'
                                      ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-dark-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            {summary ? 'Summary synced with MongoDB' : 'No summary generated yet'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
