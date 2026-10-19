import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../services/task.api';
import { workspaceApi } from '../services/workspace.api';
import { Task, TaskStatus, TaskPriority, CreateTaskDTO, UpdateTaskDTO } from '../types/task.types';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
  Video,
  Building2,
  AlertCircle,
  Loader2,
  X,
  ArrowUpRight,
  ListTodo,
} from 'lucide-react';

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  {
    id: 'todo',
    label: 'TODO',
    color: 'text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'in_progress',
    label: 'IN PROGRESS',
    color: 'text-blue-400 border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'completed',
    label: 'COMPLETED',
    color: 'text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
];

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string; border: string }> = {
  urgent: { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
  medium: { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  low: { text: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' },
};

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightedTaskId = searchParams.get('taskId');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formWorkspaceId, setFormWorkspaceId] = useState('');
  const [formAssigneeName, setFormAssigneeName] = useState('');

  // Dragging state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Fetch workspaces for dropdown filter & task assignment
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.getWorkspaces,
  });

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
  } = useQuery<Task[]>({
    queryKey: [
      'tasks',
      selectedWorkspace,
      selectedPriority,
      assigneeFilter,
      searchTerm,
    ],
    queryFn: () =>
      taskApi.getTasks({
        workspaceId: selectedWorkspace || undefined,
        priority: selectedPriority || undefined,
        assigneeId: assigneeFilter === 'me' ? 'me' : undefined,
        search: searchTerm || undefined,
      }),
    refetchInterval: 10000,
  });

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskDTO) => taskApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeModal();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDTO }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeModal();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Scroll to highlighted task if in URL
  useEffect(() => {
    if (highlightedTaskId && tasks.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`task-card-${highlightedTaskId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-brand-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-brand-400'), 3000);
        }
      }, 300);
    }
  }, [highlightedTaskId, tasks]);

  const openCreateModal = (defaultStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormStatus(defaultStatus);
    setFormPriority('medium');
    setFormDueDate('');
    setFormWorkspaceId(selectedWorkspace || '');
    setFormAssigneeName(user?.name || '');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    );
    const wsId =
      typeof task.workspace === 'object' && task.workspace
        ? task.workspace.id
        : (task.workspace as string) || '';
    setFormWorkspaceId(wsId);
    setFormAssigneeName(task.assignee?.name || task.assigneeName || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data: {
          title: formTitle.trim(),
          description: formDescription.trim(),
          status: formStatus,
          priority: formPriority,
          dueDate: formDueDate || null,
          workspaceId: formWorkspaceId || null,
          assigneeName: formAssigneeName.trim(),
        },
      });
    } else {
      createTaskMutation.mutate({
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        dueDate: formDueDate || null,
        workspaceId: formWorkspaceId || undefined,
        assigneeName: formAssigneeName.trim(),
      });
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== targetStatus) {
        updateTaskMutation.mutate({
          id: taskId,
          data: { status: targetStatus },
        });
      }
    }
  };

  const moveTaskStatus = (task: Task, direction: 'prev' | 'next') => {
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];
    const currentIndex = statuses.indexOf(task.status);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statuses.length) {
      updateTaskMutation.mutate({
        id: task.id,
        data: { status: statuses[nextIndex] },
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 mb-3 text-brand-400 text-xs font-semibold">
            <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
            <span>Task Management & Execution</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Team Task Board
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Convert meeting action items into trackable deliverables and manage tasks
            across workspaces.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('todo')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center space-x-2 shadow-glow-brand transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, assignees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Workspace dropdown */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none"
            >
              <option value="">All Workspaces</option>
              {workspaces.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Quick Assignee Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            onClick={() => setAssigneeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              assigneeFilter === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setAssigneeFilter('me')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              assigneeFilter === 'me'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Assigned to Me
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="glass-panel p-16 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-3" />
          <p className="text-sm text-slate-400">Loading task board...</p>
        </div>
      ) : isError ? (
        <div className="glass-panel p-8 rounded-3xl border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{(error as any)?.message || 'Failed to load tasks'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="glass-panel rounded-3xl border border-white/10 p-5 flex flex-col min-h-[500px] transition-colors"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${col.color} ${col.bg}`}
                    >
                      {col.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      ({columnTasks.length})
                    </span>
                  </div>

                  <button
                    onClick={() => openCreateModal(col.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3.5">
                  {columnTasks.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-48">
                      <ListTodo className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500">No tasks in {col.label}</p>
                      <button
                        onClick={() => openCreateModal(col.id)}
                        className="mt-3 text-[11px] text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Create task
                      </button>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priority =
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                      const isPastDue =
                        task.dueDate &&
                        task.status !== 'completed' &&
                        new Date(task.dueDate) < new Date();

                      return (
                        <div
                          key={task.id}
                          id={`task-card-${task.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className="glass-card p-4 rounded-2xl border border-white/10 hover:border-brand-500/40 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 group space-y-3 shadow-md"
                        >
                          {/* Card Header: Priority & Actions */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${priority.text} ${priority.bg} ${priority.border}`}
                            >
                              {task.priority}
                            </span>

                            <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(task)}
                                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this task?')) {
                                    deleteTaskMutation.mutate(task.id);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-brand-300 transition-colors">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Meeting Link Badge (if originating from meeting) */}
                          {task.roomId && (
                            <Link
                              to={`/meetings/${task.roomId}/dashboard`}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium transition-colors"
                              title="Jump to Post-Meeting Dashboard"
                            >
                              <Video className="w-3 h-3 text-indigo-400" />
                              <span className="truncate max-w-[140px]">
                                {typeof task.meeting === 'object' && task.meeting
                                  ? task.meeting.title
                                  : task.roomId}
                              </span>
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </Link>
                          )}

                          {/* Footer: Assignee, Due Date, Move Controls */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                            {/* Assignee */}
                            <div className="flex items-center space-x-1.5 truncate max-w-[120px]">
                              <div className="w-5 h-5 rounded-full bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-[10px] font-bold text-brand-300 shrink-0">
                                {task.assignee?.name
                                  ? task.assignee.name.charAt(0).toUpperCase()
                                  : task.assigneeName
                                    ? task.assigneeName.charAt(0).toUpperCase()
                                    : 'T'}
                              </div>
                              <span className="text-[11px] truncate">
                                {task.assignee?.name || task.assigneeName || 'Unassigned'}
                              </span>
                            </div>

                            {/* Due date */}
                            {task.dueDate && (
                              <div
                                className={`flex items-center space-x-1 text-[11px] ${
                                  isPastDue ? 'text-rose-400 font-bold' : 'text-slate-400'
                                }`}
                                title={
                                  isPastDue
                                    ? 'Task is overdue!'
                                    : `Due: ${new Date(task.dueDate).toLocaleDateString()}`
                                }
                              >
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            )}

                            {/* Mobile / Click status move buttons */}
                            <div className="flex items-center space-x-1">
                              {task.status !== 'todo' && (
                                <button
                                  onClick={() => moveTaskStatus(task, 'prev')}
                                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                  title="Move to previous status"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}
                              {task.status !== 'completed' && (
                                <button
                                  onClick={() => moveTaskStatus(task, 'next')}
                                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                                  title="Move to next status"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              className="glass-panel border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-brand-400" />
                  <span>{editingTask ? 'Edit Task' : 'Create New Task'}</span>
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement WebRTC re-negotiation handler"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed notes or context..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                      className="w-full px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="todo">TODO</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="completed">COMPLETED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Assignee & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Assignee
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bob or team member"
                      value={formAssigneeName}
                      onChange={(e) => setFormAssigneeName(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none text-slate-300"
                    />
                  </div>
                </div>

                {/* Workspace Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Workspace (Optional)
                  </label>
                  <select
                    value={formWorkspaceId}
                    onChange={(e) => setFormWorkspaceId(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-900/80 border border-white/10 focus:border-brand-500 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="">No workspace</option>
                    {workspaces.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      createTaskMutation.isPending ||
                      updateTaskMutation.isPending ||
                      !formTitle.trim()
                    }
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 disabled:opacity-50 transition-colors"
                  >
                    {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
