import {
  ITranscriptionProvider,
  TranscriptionOptions,
  TranscriptionResult,
} from '../transcription.types.js';

export class MockTranscriptionProvider implements ITranscriptionProvider {
  readonly name = 'mock';

  /**
   * The mock provider is always available locally without requiring external credentials.
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Transcribes an audio buffer locally using realistic meeting dialogue simulation
   * or deterministic test audio payloads.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    _mimeType: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const speaker = options?.speakerName || 'Speaker';
    const bufferSize = audioBuffer.length;

    // Estimate audio duration based on buffer size (assuming ~16kB/s for speech audio)
    const estimatedDuration = Math.max(1, Math.round(bufferSize / 16000));
    const startTime = options?.startTime ?? 0;
    const endTime = options?.endTime ?? startTime + estimatedDuration;

    let recognizedText: string;

    // If a prompt or test hint was passed in options, respect it
    if (options?.prompt) {
      recognizedText = options.prompt;
    } else {
      // Realistic meeting dialogues for simulated speech
      const samplePhrases = [
        'Welcome everyone to the sprint review and planning session.',
        'The WebRTC signaling and presence tracking modules are working smoothly.',
        'Now we are verifying the meeting audio capture and transcription pipeline.',
        'The audio chunks are being recorded and processed by the transcription service.',
        'All transcript segments are saved with speaker names, timestamps, and confidence scores.',
        'Let us ensure our MongoDB persistence and REST retrieval APIs are working as expected.',
      ];

      // Deterministic selection based on buffer size and speaker
      const hash = (bufferSize + speaker.length) % samplePhrases.length;
      recognizedText = samplePhrases[hash];
    }

    const words = recognizedText.split(' ').map((w, idx, arr) => {
      const step = estimatedDuration / Math.max(arr.length, 1);
      return {
        word: w.replace(/[.,]/g, ''),
        start: Number((startTime + idx * step).toFixed(2)),
        end: Number((startTime + (idx + 1) * step).toFixed(2)),
        confidence: 0.95,
      };
    });

    console.log(
      `[MockTranscriptionProvider] Successfully processed ${bufferSize} bytes of audio for speaker "${speaker}". Output: "${recognizedText}"`
    );

    return {
      text: recognizedText,
      confidence: 0.96,
      language: options?.language || 'en-US',
      duration: estimatedDuration,
      provider: this.name,
      segments: [
        {
          text: recognizedText,
          speakerName: speaker,
          speakerId: options?.speakerId,
          startTime,
          endTime,
          confidence: 0.96,
          words,
        },
      ],
    };
  }
}
