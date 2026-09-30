import { config } from '../../../config/env.js';
import {
  ITranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from '../transcription.types.js';

export class OpenAIWhisperProvider implements ITranscriptionProvider {
  readonly name = 'openai';

  isAvailable(): boolean {
    return Boolean(config.transcription.openaiApiKey && config.transcription.openaiApiKey.trim().length > 0);
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'OpenAI API key is not configured. Set OPENAI_API_KEY in server/.env or switch TRANSCRIPTION_PROVIDER=mock for local development.'
      );
    }

    const apiKey = config.transcription.openaiApiKey;
    const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'webm';
    const fileName = `meeting-audio-${Date.now()}.${extension}`;

    // Native Node.js FormData & Blob
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    if (options?.language) {
      formData.append('language', options.language);
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }

    console.log(
      `[OpenAIWhisperProvider] Sending ${audioBuffer.length} bytes of audio (${mimeType}) to OpenAI Whisper API...`
    );

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI Whisper API request failed with status ${response.status}: ${errorText}`
      );
    }

    const data: any = await response.json();

    const segments = (data.segments || []).map((seg: any) => ({
      text: seg.text?.trim() || '',
      speakerName: options?.speakerName,
      speakerId: options?.speakerId,
      startTime: seg.start,
      endTime: seg.end,
      confidence: seg.avg_logprob ? Math.min(1, Math.max(0, Math.exp(seg.avg_logprob))) : 0.95,
      words: (seg.words || []).map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    }));

    // If verbose_json did not produce separate segments, create one default segment
    if (segments.length === 0 && data.text) {
      segments.push({
        text: data.text.trim(),
        speakerName: options?.speakerName,
        speakerId: options?.speakerId,
        startTime: options?.startTime ?? 0,
        endTime: options?.endTime ?? (data.duration || 0),
        confidence: 0.95,
      });
    }

    return {
      text: data.text?.trim() || '',
      confidence: 0.95,
      language: data.language || options?.language || 'en-US',
      duration: data.duration,
      provider: this.name,
      segments,
    };
  }
}
