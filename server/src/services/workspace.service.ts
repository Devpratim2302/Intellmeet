import mongoose from 'mongoose';
import { Workspace, IWorkspace, WorkspaceRole } from '../models/workspace.model.js';
import { User } from '../models/user.model.js';

export interface CreateWorkspaceDTO {
  name: string;
  description?: string;
  ownerId: string;
}

export class WorkspaceService {
  /**
   * Creates a new team workspace and assigns creator as owner
   */
  async createWorkspace(data: CreateWorkspaceDTO): Promise<IWorkspace> {
    const trimmedName = data.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      const error: any = new Error('Workspace name must be at least 2 characters');
      error.statusCode = 400;
      throw error;
    }

    const baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug || 'workspace'}-${randomSuffix}`;

    const ownerObjectId = new mongoose.Types.ObjectId(data.ownerId);

    const workspace = new Workspace({
      name: trimmedName,
      slug,
      description: data.description?.trim() || '',
      owner: ownerObjectId,
      members: [
        {
          user: ownerObjectId,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
      meetings: [],
    });

    await workspace.save();
    return workspace;
  }

  /**
   * Retrieves all workspaces that the user belongs to
   */
  async getUserWorkspaces(userId: string): Promise<IWorkspace[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Workspace.find({
      $or: [{ owner: userObjectId }, { 'members.user': userObjectId }],
    })
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');
  }

  /**
   * Retrieves a single workspace by ID or slug and verifies membership
   */
  async getWorkspace(
    workspaceIdOrSlug: string,
    requestingUserId: string
  ): Promise<{ workspace: IWorkspace; userRole: WorkspaceRole }> {
    let query: any;
    if (mongoose.Types.ObjectId.isValid(workspaceIdOrSlug)) {
      query = { _id: new mongoose.Types.ObjectId(workspaceIdOrSlug) };
    } else {
      query = { slug: workspaceIdOrSlug.toLowerCase() };
    }

    const workspace = await Workspace.findOne(query)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      const error: any = new Error('Workspace not found');
      error.statusCode = 404;
      throw error;
    }

    const memberRecord = workspace.members.find(
      (m) => m.user?._id?.toString() === requestingUserId || (m.user as any)?.toString() === requestingUserId
    );

    const isOwner = workspace.owner._id.toString() === requestingUserId;

    if (!memberRecord && !isOwner) {
      const error: any = new Error('Access denied: You are not a member of this workspace');
      error.statusCode = 403;
      throw error;
    }

    const userRole: WorkspaceRole = isOwner ? 'owner' : (memberRecord?.role || 'viewer');
    return { workspace, userRole };
  }

  /**
   * Updates workspace name or description (owner/admin only)
   */
  async updateWorkspace(
    workspaceId: string,
    updates: { name?: string; description?: string },
    requestingUserId: string
  ): Promise<IWorkspace> {
    const { workspace, userRole } = await this.getWorkspace(workspaceId, requestingUserId);

    if (userRole !== 'owner' && userRole !== 'admin') {
      const error: any = new Error('Permission denied: Only workspace owners and admins can update settings');
      error.statusCode = 403;
      throw error;
    }

    if (updates.name) workspace.name = updates.name.trim();
    if (updates.description !== undefined) workspace.description = updates.description.trim();

    await workspace.save();
    return workspace;
  }

  /**
   * Deletes workspace (owner only)
   */
  async deleteWorkspace(workspaceId: string, requestingUserId: string): Promise<boolean> {
    const { workspace, userRole } = await this.getWorkspace(workspaceId, requestingUserId);

    if (userRole !== 'owner') {
      const error: any = new Error('Permission denied: Only the workspace owner can delete the workspace');
      error.statusCode = 403;
      throw error;
    }

    await Workspace.findByIdAndDelete(workspace._id);
    return true;
  }

  /**
   * Adds a member to the workspace by email or user ID (owner/admin only)
   */
  async addMember(
    workspaceId: string,
    targetIdentifier: string,
    role: WorkspaceRole = 'member',
    requestingUserId: string
  ): Promise<IWorkspace> {
    const { workspace, userRole } = await this.getWorkspace(workspaceId, requestingUserId);

    if (userRole !== 'owner' && userRole !== 'admin') {
      const error: any = new Error('Permission denied: Only owners and admins can add workspace members');
      error.statusCode = 403;
      throw error;
    }

    // Resolve target user
    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(targetIdentifier)) {
      targetUser = await User.findById(targetIdentifier);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ email: targetIdentifier.toLowerCase().trim() });
    }

    if (!targetUser) {
      const error: any = new Error(`User "${targetIdentifier}" not found. User must register first.`);
      error.statusCode = 404;
      throw error;
    }

    const alreadyMember = workspace.members.some(
      (m) => m.user?._id?.toString() === targetUser._id.toString() || (m.user as any)?.toString() === targetUser._id.toString()
    );

    if (alreadyMember) {
      const error: any = new Error('User is already a member of this workspace');
      error.statusCode = 409;
      throw error;
    }

    workspace.members.push({
      user: targetUser._id as mongoose.Types.ObjectId,
      role: role === 'owner' ? 'admin' : role, // Only one owner allowed
      joinedAt: new Date(),
    });

    await workspace.save();
    return Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar') as any;
  }

  /**
   * Updates a member's role (owner/admin only)
   */
  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: WorkspaceRole,
    requestingUserId: string
  ): Promise<IWorkspace> {
    const { workspace, userRole } = await this.getWorkspace(workspaceId, requestingUserId);

    if (userRole !== 'owner' && userRole !== 'admin') {
      const error: any = new Error('Permission denied: Only owners and admins can change member roles');
      error.statusCode = 403;
      throw error;
    }

    if (workspace.owner._id.toString() === targetUserId) {
      const error: any = new Error('Cannot change the role of the workspace owner');
      error.statusCode = 400;
      throw error;
    }

    const member = workspace.members.find(
      (m) => m.user?._id?.toString() === targetUserId || (m.user as any)?.toString() === targetUserId
    );

    if (!member) {
      const error: any = new Error('Member not found in workspace');
      error.statusCode = 404;
      throw error;
    }

    member.role = newRole === 'owner' ? 'admin' : newRole;
    await workspace.save();

    return Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar') as any;
  }

  /**
   * Removes a member from the workspace (owner/admin, or member leaving)
   */
  async removeMember(
    workspaceId: string,
    targetUserId: string,
    requestingUserId: string
  ): Promise<IWorkspace> {
    const { workspace, userRole } = await this.getWorkspace(workspaceId, requestingUserId);

    const isSelfRemoval = requestingUserId === targetUserId;

    if (!isSelfRemoval && userRole !== 'owner' && userRole !== 'admin') {
      const error: any = new Error('Permission denied: Only owners and admins can remove other members');
      error.statusCode = 403;
      throw error;
    }

    if (workspace.owner._id.toString() === targetUserId) {
      const error: any = new Error('The workspace owner cannot be removed. Transfer ownership or delete the workspace.');
      error.statusCode = 400;
      throw error;
    }

    const memberIndex = workspace.members.findIndex(
      (m) => m.user?._id?.toString() === targetUserId || (m.user as any)?.toString() === targetUserId
    );

    if (memberIndex === -1) {
      const error: any = new Error('User is not a member of this workspace');
      error.statusCode = 404;
      throw error;
    }

    workspace.members.splice(memberIndex, 1);
    await workspace.save();

    return Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar') as any;
  }
}

export const workspaceService = new WorkspaceService();
