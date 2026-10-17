import { config } from '../../../config/env.js';
import {
  ITranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from '../transcription.types.js';

export class GeminiTranscriptionProvider implements ITranscriptionProvider {
  readonly name = 'gemini';

  isAvailable(): boolean {
    return Boolean(
      config.transcription.geminiApiKey && config.transcription.geminiApiKey.trim().length > 0
    );
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Gemini API key is not configured. Set GEMINI_API_KEY in server/.env or switch TRANSCRIPTION_PROVIDER=mock for local development.'
      );
    }

    const apiKey = config.transcription.geminiApiKey;
    const model = process.env.GEMINI_TRANSCRIPTION_MODEL || 'gemini-3.5-flash-lite';

    // Normalize MIME type by stripping codecs or extra parameters (e.g., 'audio/webm;codecs=opus' -> 'audio/webm')
    const normalizedMime = mimeType.split(';')[0].trim() || 'audio/webm';
    const base64Data = audioBuffer.toString('base64');

    const prompt =
      options?.prompt ||
      'Transcribe the speech in this audio accurately. If the audio is silent or contains only background noise without spoken dialogue, return an empty string. Return only the verbatim transcription without conversational commentary or markdown block formatting.';

    console.log(
      `[GeminiTranscriptionProvider] Sending ${audioBuffer.length} bytes of audio (${normalizedMime}) to Gemini API (${model})...`
    );

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: normalizedMime,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini transcription API failed with status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const candidatePart = data.candidates?.[0]?.content?.parts?.[0];
    const rawText = candidatePart?.text || '';

    // Strip markdown code fences if Gemini wrapped response in ```
    const transcribedText = rawText
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    return {
      text: transcribedText,
      confidence: 0.95,
      segments: [
        {
          text: transcribedText,
          speakerName: options?.speakerName,
          speakerId: options?.speakerId,
          startTime: options?.startTime,
          endTime: options?.endTime,
          confidence: 0.95,
        },
      ],
      language: options?.language || 'en',
      provider: 'gemini',
    };
  }
}
