import { Router } from 'express';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
} from '../controllers/meeting.controller.js';
import {
  getMeetingMessages,
  createMeetingMessage,
} from '../controllers/message.controller.js';
import {
  getMeetingTranscript,
  uploadAndTranscribeAudio,
  addTranscriptSegment,
  deleteMeetingTranscript,
  listTranscriptionProviders,
} from '../controllers/transcript.controller.js';
import {
  generateMeetingSummary,
  getMeetingSummary,
  getMeetingActionItems,
  createMeetingActionItem,
  updateActionItem,
  deleteActionItem,
} from '../controllers/summary.controller.js';
import {
  createMeetingSchema,
  updateMeetingSchema,
} from '../validators/meeting.validator.js';
import { createMessageSchema } from '../validators/message.validator.js';
import { addTranscriptSegmentSchema } from '../validators/transcript.validator.js';
import {
  createActionItemSchema,
  updateActionItemSchema,
} from '../validators/action-item.validator.js';
import { validateRequest } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { audioUpload } from '../middleware/upload.middleware.js';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

// Global provider status route (must come before /:id)
router.get('/transcription/providers', listTranscriptionProviders);

router.post('/', validateRequest(createMeetingSchema), createMeeting);
router.get('/', listMeetings);
router.get('/:id', getMeeting);
router.patch('/:id', validateRequest(updateMeetingSchema), updateMeeting);
router.delete('/:id', deleteMeeting);

// Meeting chat message routes
router.get('/:id/messages', getMeetingMessages);
router.post('/:id/messages', validateRequest(createMessageSchema), createMeetingMessage);

// Meeting transcription routes
router.get('/:id/transcript', getMeetingTranscript);
router.post('/:id/transcripts/audio', audioUpload.single('audio'), uploadAndTranscribeAudio);
router.post(
  '/:id/transcripts/segments',
  validateRequest(addTranscriptSegmentSchema),
  addTranscriptSegment
);
router.delete('/:id/transcript', deleteMeetingTranscript);

// AI Summary & Action Items routes
router.post('/:id/summary/generate', generateMeetingSummary);
router.get('/:id/summary', getMeetingSummary);
router.get('/:id/action-items', getMeetingActionItems);
router.post(
  '/:id/action-items',
  validateRequest(createActionItemSchema),
  createMeetingActionItem
);
router.patch(
  '/:id/action-items/:itemId',
  validateRequest(updateActionItemSchema),
  updateActionItem
);
router.delete('/:id/action-items/:itemId', deleteActionItem);

export default router;


