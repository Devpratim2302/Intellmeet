import { Router } from 'express';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from '../controllers/workspace.controller.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema,
} from '../validators/workspace.validator.js';
import { validateRequest } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

router.post('/', validateRequest(createWorkspaceSchema), createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspace);
router.patch('/:id', validateRequest(updateWorkspaceSchema), updateWorkspace);
router.delete('/:id', deleteWorkspace);

// Workspace member management
router.post(
  '/:id/members',
  validateRequest(addWorkspaceMemberSchema),
  addWorkspaceMember
);
router.patch(
  '/:id/members/:memberUserId',
  validateRequest(updateWorkspaceMemberRoleSchema),
  updateWorkspaceMemberRole
);
router.delete('/:id/members/:memberUserId', removeWorkspaceMember);

export default router;
