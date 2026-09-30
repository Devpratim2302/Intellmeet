import { Request, Response, NextFunction } from 'express';
import { workspaceService } from '../services/workspace.service.js';

export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { name, description } = req.body;

    const workspace = await workspaceService.createWorkspace({
      name,
      description,
      ownerId: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const workspaces = await workspaceService.getUserWorkspaces(userId);

    res.status(200).json({
      success: true,
      data: {
        workspaces,
        count: workspaces.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    const { workspace, userRole } = await workspaceService.getWorkspace(id, userId);

    res.status(200).json({
      success: true,
      data: {
        workspace,
        userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { name, description } = req.body;

    const updated = await workspaceService.updateWorkspace(id, { name, description }, userId);

    res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      data: {
        workspace: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    await workspaceService.deleteWorkspace(id, userId);

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const addWorkspaceMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { userIdentifier, role } = req.body;

    const updated = await workspaceService.addMember(id, userIdentifier, role, userId);

    res.status(201).json({
      success: true,
      message: 'Member added to workspace successfully',
      data: {
        workspace: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspaceMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, memberUserId } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { role } = req.body;

    const updated = await workspaceService.updateMemberRole(id, memberUserId, role, userId);

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: {
        workspace: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeWorkspaceMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, memberUserId } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    const updated = await workspaceService.removeMember(id, memberUserId, userId);

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace successfully',
      data: {
        workspace: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};
