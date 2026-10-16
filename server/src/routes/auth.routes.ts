import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  uploadAvatar,
  deleteAvatar,
} from '../controllers/auth.controller.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  validateRequest,
} from '../validators/auth.validator.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { imageUpload } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes with rate limiting & schema validation
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshTokenSchema), refreshToken);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/avatar', authenticate, imageUpload.single('avatar'), uploadAvatar);
router.delete('/avatar', authenticate, deleteAvatar);

export default router;
