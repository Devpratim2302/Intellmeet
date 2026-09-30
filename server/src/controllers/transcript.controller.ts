import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { transcriptionService } from '../services/transcription/transcription.service.js';
import { ITranscriptSpeaker } from '../models/transcript.model.js';

export const getMeetingTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const transcript = await transcriptionService.getMeetingTranscript(id);

    if (!transcript) {
      res.status(200).json({
        success: true,
        data: {
          transcript: null,
          segments: [],
          fullText: '',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        transcript,
        segments: transcript.segments,
        fullText: transcript.fullText,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAndTranscribeAudio = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No audio file uploaded. Please send a valid audio recording.',
      });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const speaker: ITranscriptSpeaker = {
      id: user._id as mongoose.Types.ObjectId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    const startTime = req.body.startTime ? parseFloat(req.body.startTime) : undefined;
    const endTime = req.body.endTime ? parseFloat(req.body.endTime) : undefined;
    const language = req.body.language;
    const prompt = req.body.prompt;
    const providerName = req.body.provider;

    const { transcript, segment, result } = await transcriptionService.processMeetingAudio(
      id,
      req.file.buffer,
      req.file.mimetype,
      speaker,
      {
        startTime,
        endTime,
        language,
        prompt,
        providerName,
      }
    );

    // Broadcast new segment to active room participants via Socket.io
    const io = req.app.get('io');
    if (io) {
      const room = `room:${transcript.roomId.toLowerCase()}`;
      io.to(room).emit('new-transcript-segment', {
        roomId: transcript.roomId,
        segment,
        fullText: transcript.fullText,
        provider: result.provider,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Audio chunk successfully transcribed and recorded',
      data: {
        segment,
        transcript,
        provider: result.provider,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addTranscriptSegment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const speaker: ITranscriptSpeaker = {
      id: user._id as mongoose.Types.ObjectId,
      name: req.body.speakerName || user.name,
      email: user.email,
      avatar: user.avatar,
    };

    const { transcript, segment } = await transcriptionService.addSegment(id, {
      speaker,
      text: req.body.text,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      confidence: req.body.confidence,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
    });

    // Broadcast new segment to active room participants via Socket.io
    const io = req.app.get('io');
    if (io) {
      const room = `room:${transcript.roomId.toLowerCase()}`;
      io.to(room).emit('new-transcript-segment', {
        roomId: transcript.roomId,
        segment,
        fullText: transcript.fullText,
        provider: transcript.provider,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Transcript segment added successfully',
      data: {
        segment,
        transcript,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMeetingTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await transcriptionService.deleteMeetingTranscript(id);

    res.status(200).json({
      success: true,
      message: deleted
        ? 'Meeting transcript deleted successfully'
        : 'No transcript found to delete',
    });
  } catch (error) {
    next(error);
  }
};

export const listTranscriptionProviders = (
  _req: Request,
  res: Response
): void => {
  const providers = transcriptionService.getProvidersInfo();
  res.status(200).json({
    success: true,
    data: {
      providers,
    },
  });
};
