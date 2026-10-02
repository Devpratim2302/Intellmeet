import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  convertActionItem,
} from '../controllers/task.controller.js';
import {
  createTaskSchema,
  updateTaskSchema,
  convertActionItemSchema,
} from '../validators/task.validator.js';
import { validateRequest } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.post('/', validateRequest(createTaskSchema), createTask);
router.get('/', getTasks);
router.post('/convert-action-item', validateRequest(convertActionItemSchema), convertActionItem);
router.get('/:id', getTask);
router.patch('/:id', validateRequest(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

export default router;
