export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  speakerName?: string;
  speakerId?: string;
  speakerAvatar?: string;
  speakerEmail?: string;
  roomId?: string;
  startTime?: number;
  endTime?: number;
}

export interface TranscriptionWordResult {
  word: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface TranscriptionResultSegment {
  text: string;
  speakerName?: string;
  speakerId?: string;
  startTime?: number;
  endTime?: number;
  confidence?: number;
  words?: TranscriptionWordResult[];
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  segments?: TranscriptionResultSegment[];
  language?: string;
  duration?: number;
  provider: string;
}

export interface ITranscriptionProvider {
  readonly name: string;
  isAvailable(): boolean;
  transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}
