import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Users,
  Trash2,
  UserPlus,
  Loader2,
  X,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { workspaceApi } from '../services/workspace.api';
import { Workspace, WorkspaceRole } from '../types/workspace.types';
import { useAuth } from '../context/AuthContext';

export const WorkspacesPage: React.FC = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Workspace Modal
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manage Members Modal
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [userRole, setUserRole] = useState<WorkspaceRole>('member');
  const [isManagingMembers, setIsManagingMembers] = useState<boolean>(false);
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceRole>('member');
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);

  const fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      const list = await workspaceApi.getWorkspaces();
      setWorkspaces(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await workspaceApi.createWorkspace({
        name: name.trim(),
        description: description.trim(),
      });
      setWorkspaces((prev) => [created, ...prev]);
      setName('');
      setDescription('');
      setIsCreating(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMembersModal = async (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setIsManagingMembers(true);
    setMemberActionError(null);

    // Determine current user role
    try {
      const details = await workspaceApi.getWorkspace(ws.id);
      setSelectedWorkspace(details.workspace);
      setUserRole(details.userRole);
    } catch (err: any) {
      console.warn('Could not refresh workspace role:', err.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace || !newMemberEmail.trim()) return;

    setIsAddingMember(true);
    setMemberActionError(null);
    try {
      const updated = await workspaceApi.addMember(
        selectedWorkspace.id,
        newMemberEmail.trim(),
        newMemberRole
      );
      setSelectedWorkspace(updated);
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setNewMemberEmail('');
    } catch (err: any) {
      setMemberActionError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateRole = async (targetUserId: string, nextRole: WorkspaceRole) => {
    if (!selectedWorkspace) return;
    try {
      const updated = await workspaceApi.updateMemberRole(
        selectedWorkspace.id,
        targetUserId,
        nextRole
      );
      setSelectedWorkspace(updated);
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!selectedWorkspace) return;
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      const updated = await workspaceApi.removeMember(selectedWorkspace.id, targetUserId);
      setSelectedWorkspace(updated);
      setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    if (!window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.'))
      return;

    try {
      await workspaceApi.deleteWorkspace(wsId);
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));
      if (selectedWorkspace?.id === wsId) {
        setIsManagingMembers(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-dark-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-brand-400" />
              <span>Team Workspaces</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Organize collaborative spaces, manage cross-functional roles, and track shared meeting deliverables.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Workspace</span>
          </button>
        </div>

        {/* Workspaces List */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            <p className="text-sm">Loading team workspaces...</p>
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mx-auto">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Workspaces Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create your first team workspace to organize members, assign administrative roles, and collaborate on shared meeting action items.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => {
              const isOwner = ws.owner.id === user?.id || (ws.owner as any) === user?.id;
              const currentMember = ws.members.find(
                (m) => m.user?.id === user?.id || (m.user as any) === user?.id
              );
              const userRoleBadge = isOwner ? 'owner' : currentMember?.role || 'member';

              return (
                <div
                  key={ws.id}
                  className="glass-card p-6 rounded-3xl border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          userRoleBadge === 'owner'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : userRoleBadge === 'admin'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : 'bg-brand-500/10 text-brand-300 border-brand-500/30'
                        }`}
                      >
                        {userRoleBadge}
                      </span>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteWorkspace(ws.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                        {ws.name}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">slug: {ws.slug}</p>
                    </div>

                    {ws.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {ws.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{ws.members.length} member{ws.members.length !== 1 ? 's' : ''}</span>
                    </div>

                    <button
                      onClick={() => handleOpenMembersModal(ws)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10 flex items-center space-x-1.5 text-xs"
                    >
                      <span>Members</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Workspace Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-400" />
                  <span>Create Team Workspace</span>
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateWorkspace} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Workspace Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Core Engineering, Product Design"
                    required
                    className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this team or workspace collaborate on?"
                    rows={3}
                    className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-all shadow-md shadow-brand-600/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Members Modal */}
        {isManagingMembers && selectedWorkspace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-dark-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/50">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-400" />
                    <span>{selectedWorkspace.name} — Members</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your role: <span className="font-semibold text-brand-300 uppercase text-[10px]">{userRole}</span>
                  </p>
                </div>

                <button
                  onClick={() => setIsManagingMembers(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Add Member Form (Owners / Admins only) */}
                {(userRole === 'owner' || userRole === 'admin') && (
                  <form
                    onSubmit={handleAddMember}
                    className="p-4 rounded-2xl bg-dark-800/80 border border-white/10 space-y-3 text-xs"
                  >
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-brand-400" />
                      <span>Add Member</span>
                    </h4>

                    {memberActionError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        {memberActionError}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="colleague@intellmeet.io"
                        required
                        className="flex-1 px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500"
                      />
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as WorkspaceRole)}
                        className="px-3 py-2 bg-dark-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isAddingMember}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-brand-600/30 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isAddingMember ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Member List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Current Members ({selectedWorkspace.members.length})
                  </h4>

                  <div className="space-y-2">
                    {selectedWorkspace.members.map((member) => {
                      const memberUser = member.user as any;
                      const isTargetOwner = selectedWorkspace.owner?.id === memberUser?._id || selectedWorkspace.owner === memberUser?._id;
                      const canManage = (userRole === 'owner' || userRole === 'admin') && !isTargetOwner;

                      return (
                        <div
                          key={memberUser?._id || memberUser?.id}
                          className="p-3.5 rounded-2xl bg-dark-800/60 border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {memberUser?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <span>{memberUser?.name}</span>
                                {memberUser?._id === user?.id && (
                                  <span className="text-[10px] text-brand-300 font-normal">(You)</span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400">{memberUser?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {canManage ? (
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleUpdateRole(
                                    memberUser?._id || memberUser?.id,
                                    e.target.value as WorkspaceRole
                                  )
                                }
                                className="px-2.5 py-1 bg-dark-900 border border-white/10 rounded-lg text-[11px] text-slate-200 focus:outline-none"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  member.role === 'owner'
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : member.role === 'admin'
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                      : 'bg-brand-500/10 text-brand-300 border-brand-500/30'
                                }`}
                              >
                                {member.role}
                              </span>
                            )}

                            {canManage && (
                              <button
                                onClick={() => handleRemoveMember(memberUser?._id || memberUser?.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-dark-950/60 flex justify-end">
                <button
                  onClick={() => setIsManagingMembers(false)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
