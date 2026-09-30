import { api } from './api';
import {
  Transcript,
  TranscriptSegment,
  TranscriptionProviderInfo,
} from '../types/transcript.types';

export interface UploadAudioPayload {
  startTime?: number;
  endTime?: number;
  language?: string;
  prompt?: string;
  provider?: string;
}

export interface AddSegmentPayload {
  text: string;
  speakerName?: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
}

export const transcriptApi = {
  /**
   * Retrieves the transcript for a meeting
   */
  async getTranscript(roomIdOrId: string): Promise<{
    transcript: Transcript | null;
    segments: TranscriptSegment[];
    fullText: string;
  }> {
    const res = await api.get(`/meetings/${roomIdOrId}/transcript`);
    return res.data.data;
  },

  /**
   * Uploads an audio chunk/recording to be transcribed by the backend AI service
   */
  async uploadAudio(
    roomIdOrId: string,
    audioBlob: Blob,
    metadata?: UploadAudioPayload
  ): Promise<{ segment: TranscriptSegment; transcript: Transcript; provider: string }> {
    const formData = new FormData();
    const ext = audioBlob.type.includes('wav') ? 'wav' : 'webm';
    formData.append('audio', audioBlob, `audio-chunk.${ext}`);

    if (metadata?.startTime !== undefined) {
      formData.append('startTime', metadata.startTime.toString());
    }
    if (metadata?.endTime !== undefined) {
      formData.append('endTime', metadata.endTime.toString());
    }
    if (metadata?.language) {
      formData.append('language', metadata.language);
    }
    if (metadata?.prompt) {
      formData.append('prompt', metadata.prompt);
    }
    if (metadata?.provider) {
      formData.append('provider', metadata.provider);
    }

    const res = await api.post(`/meetings/${roomIdOrId}/transcripts/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.data;
  },

  /**
   * Directly appends an already recognized speech segment
   */
  async addSegment(
    roomIdOrId: string,
    payload: AddSegmentPayload
  ): Promise<{ segment: TranscriptSegment; transcript: Transcript }> {
    const res = await api.post(`/meetings/${roomIdOrId}/transcripts/segments`, payload);
    return res.data.data;
  },

  /**
   * Clears the transcript for a meeting
   */
  async deleteTranscript(roomIdOrId: string): Promise<void> {
    await api.delete(`/meetings/${roomIdOrId}/transcript`);
  },

  /**
   * Queries available and configured AI transcription providers
   */
  async getProviders(): Promise<TranscriptionProviderInfo[]> {
    const res = await api.get('/meetings/transcription/providers');
    return res.data.data.providers;
  },
};
