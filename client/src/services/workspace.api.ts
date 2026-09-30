import { api } from './api';
import { Workspace, WorkspaceRole } from '../types/workspace.types';

export const workspaceApi = {
  /**
   * Creates a new workspace
   */
  async createWorkspace(data: { name: string; description?: string }): Promise<Workspace> {
    const res = await api.post('/workspaces', data);
    return res.data.data.workspace;
  },

  /**
   * Retrieves all workspaces for the current user
   */
  async getWorkspaces(): Promise<Workspace[]> {
    const res = await api.get('/workspaces');
    return res.data.data.workspaces;
  },

  /**
   * Retrieves a single workspace by ID or slug
   */
  async getWorkspace(idOrSlug: string): Promise<{ workspace: Workspace; userRole: WorkspaceRole }> {
    const res = await api.get(`/workspaces/${idOrSlug}`);
    return res.data.data;
  },

  /**
   * Updates workspace settings
   */
  async updateWorkspace(
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Workspace> {
    const res = await api.patch(`/workspaces/${id}`, data);
    return res.data.data.workspace;
  },

  /**
   * Deletes a workspace (owner only)
   */
  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  /**
   * Adds a member by email or user ID
   */
  async addMember(
    workspaceId: string,
    userIdentifier: string,
    role: WorkspaceRole = 'member'
  ): Promise<Workspace> {
    const res = await api.post(`/workspaces/${workspaceId}/members`, {
      userIdentifier,
      role,
    });
    return res.data.data.workspace;
  },

  /**
   * Updates a member's role
   */
  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    role: WorkspaceRole
  ): Promise<Workspace> {
    const res = await api.patch(`/workspaces/${workspaceId}/members/${memberUserId}`, { role });
    return res.data.data.workspace;
  },

  /**
   * Removes a member from the workspace
   */
  async removeMember(workspaceId: string, memberUserId: string): Promise<Workspace> {
    const res = await api.delete(`/workspaces/${workspaceId}/members/${memberUserId}`);
    return res.data.data.workspace;
  },
};
