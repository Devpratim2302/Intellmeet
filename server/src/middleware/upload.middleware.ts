import multer from 'multer';
import { Request } from 'express';
import { config } from '../config/env.js';

// Store audio files in memory as Buffer for fast AI processing
const storage = multer.memoryStorage();

const audioFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimePrefixes = ['audio/'];
  const allowedExactMimes = [
    'application/octet-stream',
    'video/webm', // MediaRecorder often produces video/webm with audio only
    'video/mp4',
  ];

  const isMimeAllowed =
    allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix)) ||
    allowedExactMimes.includes(file.mimetype);

  if (isMimeAllowed) {
    cb(null, true);
  } else {
    const error: any = new Error(
      `Unsupported audio format (${file.mimetype}). Please upload an audio file (e.g. WAV, WebM, MP3, OGG, M4A).`
    );
    error.statusCode = 400;
    cb(error);
  }
};

export const audioUpload = multer({
  storage,
  limits: {
    fileSize: config.transcription.maxUploadSizeBytes,
  },
  fileFilter: audioFileFilter,
});
