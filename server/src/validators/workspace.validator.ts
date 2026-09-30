import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Workspace name is required' })
    .min(2, 'Workspace name must be at least 2 characters')
    .max(100, 'Workspace name cannot exceed 100 characters'),
  description: z.string().max(500).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const addWorkspaceMemberSchema = z.object({
  userIdentifier: z
    .string({ required_error: 'User email or ID is required' })
    .min(2, 'User identifier is required'),
  role: z.enum(['admin', 'member', 'viewer']).optional().default('member'),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer'], {
    required_error: 'Role is required',
  }),
});
