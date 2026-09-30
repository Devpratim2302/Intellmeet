export interface TranscriptSpeaker {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface TranscriptWord {
  word: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface TranscriptSegment {
  id?: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
  words?: TranscriptWord[];
}

export interface Transcript {
  id: string;
  meeting: string;
  roomId: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  language: string;
  provider: string;
  fullText: string;
  segments: TranscriptSegment[];
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionProviderInfo {
  name: string;
  available: boolean;
  isDefault: boolean;
}
