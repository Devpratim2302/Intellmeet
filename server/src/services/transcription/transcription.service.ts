import mongoose from 'mongoose';
import { Meeting } from '../../models/meeting.model.js';
import {
  Transcript,
  ITranscript,
  ITranscriptSegment,
  ITranscriptSpeaker,
} from '../../models/transcript.model.js';
import {
  transcriptionProviderFactory,
  TranscriptionProviderFactory,
} from './provider.factory.js';
import {
  TranscriptionOptions,
  TranscriptionResult,
} from './transcription.types.js';

export interface ProcessMeetingAudioOptions {
  startTime?: number;
  endTime?: number;
  language?: string;
  prompt?: string;
  providerName?: string;
}

export interface AddTranscriptSegmentDTO {
  speaker: ITranscriptSpeaker;
  text: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
  timestamp?: Date;
}

export class TranscriptionService {
  constructor(private factory: TranscriptionProviderFactory = transcriptionProviderFactory) {}

  /**
   * Pure audio transcription using the isolated provider abstraction.
   * Does not perform DB writes.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions,
    providerName?: string
  ): Promise<TranscriptionResult> {
    if (!audioBuffer || audioBuffer.length === 0) {
      const error: any = new Error('Audio buffer is empty or missing');
      error.statusCode = 400;
      throw error;
    }

    const provider = this.factory.getProvider(providerName);
    return provider.transcribeAudio(audioBuffer, mimeType, options);
  }

  /**
   * Processes a chunk/recording of meeting audio:
   * 1. Resolves the meeting from roomId or meeting ID
   * 2. Runs the audio through the isolated transcription provider
   * 3. Appends the resulting speech segment to the meeting's Transcript in MongoDB
   * 4. Updates aggregated fullText and duration
   */
  async processMeetingAudio(
    meetingIdOrRoomId: string,
    audioBuffer: Buffer,
    mimeType: string,
    speaker: ITranscriptSpeaker,
    options?: ProcessMeetingAudioOptions
  ): Promise<{ transcript: ITranscript; segment: ITranscriptSegment; result: TranscriptionResult }> {
    const meeting = await this.resolveMeeting(meetingIdOrRoomId);

    // Run transcription through isolated provider
    const result = await this.transcribeAudio(
      audioBuffer,
      mimeType,
      {
        speakerName: speaker.name,
        speakerId: speaker.id?.toString(),
        speakerEmail: speaker.email,
        speakerAvatar: speaker.avatar,
        language: options?.language,
        prompt: options?.prompt,
        startTime: options?.startTime,
        endTime: options?.endTime,
      },
      options?.providerName
    );

    // Find or create Transcript document
    let transcript = await Transcript.findOne({
      $or: [{ meeting: meeting._id }, { roomId: meeting.roomId }],
    }).sort({ createdAt: -1 });

    if (!transcript) {
      transcript = new Transcript({
        meeting: meeting._id,
        roomId: meeting.roomId,
        status: 'recording',
        language: result.language || options?.language || 'en-US',
        provider: result.provider,
        fullText: '',
        segments: [],
        durationSeconds: 0,
        audioSizeBytes: 0,
      });
    }

    // Create the new segment
    const newSegment: ITranscriptSegment = {
      speaker: {
        id: speaker.id,
        name: speaker.name,
        email: speaker.email || '',
        avatar: speaker.avatar || '',
      },
      text: result.text.trim(),
      timestamp: new Date(),
      startTime: options?.startTime ?? 0,
      endTime: options?.endTime ?? (options?.startTime ?? 0) + (result.duration || 0),
      confidence: result.confidence ?? 0.95,
      words: result.segments?.[0]?.words,
    };

    transcript.segments.push(newSegment);

    // Synchronize full text
    transcript.fullText = this.buildFullText(transcript.segments);
    transcript.durationSeconds = (transcript.durationSeconds || 0) + (result.duration || 1);
    transcript.audioSizeBytes = (transcript.audioSizeBytes || 0) + audioBuffer.length;
    transcript.audioMimeType = mimeType;
    transcript.provider = result.provider;

    await transcript.save();

    // Get the saved subdocument with generated ID
    const savedSegment = transcript.segments[transcript.segments.length - 1];

    return {
      transcript,
      segment: savedSegment,
      result,
    };
  }

  /**
   * Adds an already-transcribed segment directly to the meeting transcript
   * (e.g. from real-time client Web Speech API or manual user entry).
   */
  async addSegment(
    meetingIdOrRoomId: string,
    dto: AddTranscriptSegmentDTO
  ): Promise<{ transcript: ITranscript; segment: ITranscriptSegment }> {
    const trimmedText = dto.text?.trim();
    if (!trimmedText) {
      const error: any = new Error('Transcript segment text cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const meeting = await this.resolveMeeting(meetingIdOrRoomId);

    let transcript = await Transcript.findOne({
      $or: [{ meeting: meeting._id }, { roomId: meeting.roomId }],
    }).sort({ createdAt: -1 });

    if (!transcript) {
      transcript = new Transcript({
        meeting: meeting._id,
        roomId: meeting.roomId,
        status: 'recording',
        language: 'en-US',
        provider: 'client-stt',
        fullText: '',
        segments: [],
      });
    }

    const newSegment: ITranscriptSegment = {
      speaker: {
        id: dto.speaker.id,
        name: dto.speaker.name,
        email: dto.speaker.email || '',
        avatar: dto.speaker.avatar || '',
      },
      text: trimmedText,
      timestamp: dto.timestamp || new Date(),
      startTime: dto.startTime ?? 0,
      endTime: dto.endTime ?? 0,
      confidence: dto.confidence ?? 0.95,
    };

    transcript.segments.push(newSegment);
    transcript.fullText = this.buildFullText(transcript.segments);

    await transcript.save();

    const savedSegment = transcript.segments[transcript.segments.length - 1];
    return { transcript, segment: savedSegment };
  }

  /**
   * Retrieves the transcript for a meeting by meeting ID or roomId
   */
  async getMeetingTranscript(meetingIdOrRoomId: string): Promise<ITranscript | null> {
    const normalized = meetingIdOrRoomId.trim().toLowerCase();

    let query: any;
    if (mongoose.Types.ObjectId.isValid(meetingIdOrRoomId)) {
      query = {
        $or: [
          { meeting: new mongoose.Types.ObjectId(meetingIdOrRoomId) },
          { roomId: normalized },
        ],
      };
    } else {
      query = { roomId: normalized };
    }

    const transcript = await Transcript.findOne(query)
      .sort({ createdAt: -1 })
      .populate('meeting', 'title roomId host status createdAt');

    return transcript;
  }

  /**
   * Deletes transcript records for a meeting
   */
  async deleteMeetingTranscript(meetingIdOrRoomId: string): Promise<boolean> {
    const normalized = meetingIdOrRoomId.trim().toLowerCase();

    let query: any;
    if (mongoose.Types.ObjectId.isValid(meetingIdOrRoomId)) {
      query = {
        $or: [
          { meeting: new mongoose.Types.ObjectId(meetingIdOrRoomId) },
          { roomId: normalized },
        ],
      };
    } else {
      query = { roomId: normalized };
    }

    const result = await Transcript.deleteMany(query);
    return (result.deletedCount || 0) > 0;
  }

  /**
   * Returns registered AI transcription providers and active provider
   */
  getProvidersInfo() {
    return this.factory.listProviders();
  }

  /**
   * Formats a clean chronological full text transcript with speaker labels
   */
  private buildFullText(segments: ITranscriptSegment[]): string {
    return segments
      .map((seg) => {
        const timeStr = seg.timestamp ? new Date(seg.timestamp).toLocaleTimeString() : '';
        const prefix = timeStr ? `[${timeStr}] ${seg.speaker.name}:` : `${seg.speaker.name}:`;
        return `${prefix} ${seg.text}`;
      })
      .join('\n');
  }

  /**
   * Helper to resolve meeting by ID or roomId, creating an ad-hoc meeting if needed
   */
  private async resolveMeeting(meetingIdOrRoomId: string): Promise<any> {
    const normalized = meetingIdOrRoomId.trim().toLowerCase();

    let meeting: any = null;
    if (mongoose.Types.ObjectId.isValid(meetingIdOrRoomId)) {
      meeting = await Meeting.findById(meetingIdOrRoomId);
    }

    if (!meeting) {
      meeting = await Meeting.findOne({ roomId: normalized });
    }

    if (!meeting) {
      // Create ad-hoc meeting record for unregistered rooms so transcript is never lost
      const randomHostId = new mongoose.Types.ObjectId();
      meeting = await Meeting.create({
        title: `Meeting ${normalized}`,
        roomId: normalized,
        host: randomHostId,
        participants: [],
        status: 'active',
      });
    }

    return meeting;
  }
}

export const transcriptionService = new TranscriptionService();
