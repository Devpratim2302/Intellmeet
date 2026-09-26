import { Router } from 'express';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meeting.controller.js';
import {
  createMeetingSchema,
  updateMeetingSchema,
} from '../validators/meeting.validator.js';
import { validateRequest } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

router.post('/', validateRequest(createMeetingSchema), createMeeting);
router.get('/', listMeetings);
router.get('/:id', getMeeting);
router.patch('/:id', validateRequest(updateMeetingSchema), updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;
