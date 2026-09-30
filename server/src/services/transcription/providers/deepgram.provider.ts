import { config } from '../../../config/env.js';
import {
  ITranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from '../transcription.types.js';

export class DeepgramTranscriptionProvider implements ITranscriptionProvider {
  readonly name = 'deepgram';

  isAvailable(): boolean {
    return Boolean(config.transcription.deepgramApiKey && config.transcription.deepgramApiKey.trim().length > 0);
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Deepgram API key is not configured. Set DEEPGRAM_API_KEY in server/.env or switch TRANSCRIPTION_PROVIDER=mock for local development.'
      );
    }

    const apiKey = config.transcription.deepgramApiKey;
    const url = new URL('https://api.deepgram.com/v1/listen');
    url.searchParams.set('model', 'nova-2');
    url.searchParams.set('smart_format', 'true');
    url.searchParams.set('diarize', 'true');
    url.searchParams.set('punctuate', 'true');
    if (options?.language) {
      url.searchParams.set('language', options.language);
    }

    console.log(
      `[DeepgramTranscriptionProvider] Sending ${audioBuffer.length} bytes of audio (${mimeType}) to Deepgram API...`
    );

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeType || 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API request failed with status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    const transcriptText = alternative?.transcript?.trim() || '';
    const confidence = alternative?.confidence ?? 0.95;

    const segments = (alternative?.paragraphs?.paragraphs || []).map((p: any) => ({
      text: p.sentences?.map((s: any) => s.text).join(' ') || '',
      speakerName: options?.speakerName,
      speakerId: options?.speakerId,
      startTime: p.start,
      endTime: p.end,
      confidence,
    }));

    if (segments.length === 0 && transcriptText) {
      segments.push({
        text: transcriptText,
        speakerName: options?.speakerName,
        speakerId: options?.speakerId,
        startTime: options?.startTime ?? 0,
        endTime: options?.endTime ?? (data.metadata?.duration || 0),
        confidence,
      });
    }

    return {
      text: transcriptText,
      confidence,
      language: options?.language || 'en-US',
      duration: data.metadata?.duration,
      provider: this.name,
      segments,
    };
  }
}
