import { describe, it, expect } from 'vitest';
import { GeminiTranscriptionProvider } from '../src/services/transcription/providers/gemini.provider.js';
import { GeminiAIAnalysisProvider } from '../src/services/ai/providers/gemini.ai.provider.js';
import { transcriptionProviderFactory } from '../src/services/transcription/provider.factory.js';
import { aiProviderFactory } from '../src/services/ai/ai.provider.factory.js';

/**
 * Creates a minimal valid 1-second PCM WAV buffer for audio transcription tests
 */
function createTestWavBuffer(sampleRate = 8000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = sampleRate * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

describe('Google Gemini AI & Transcription Integration', () => {
  it('should register Gemini in TranscriptionProviderFactory', () => {
    const provider = transcriptionProviderFactory.getProvider('gemini');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('gemini');
  });

  it('should register Gemini in AIProviderFactory', () => {
    const provider = aiProviderFactory.getProvider('gemini');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('gemini');
  });

  it('should verify GeminiTranscriptionProvider availability and interface', () => {
    const provider = new GeminiTranscriptionProvider();
    expect(provider.name).toBe('gemini');
    expect(typeof provider.isAvailable).toBe('function');
    expect(typeof provider.transcribeAudio).toBe('function');
  });

  it('should verify GeminiAIAnalysisProvider availability and interface', () => {
    const provider = new GeminiAIAnalysisProvider();
    expect(provider.name).toBe('gemini');
    expect(typeof provider.isAvailable).toBe('function');
    expect(typeof provider.generateMeetingAnalysis).toBe('function');
  });

  it('should successfully call Gemini audio transcription API when configured', async () => {
    const provider = new GeminiTranscriptionProvider();
    if (!provider.isAvailable()) {
      // If no key is set in test environment, skip live network call safely
      return;
    }

    const wavBuffer = createTestWavBuffer();
    const result = await provider.transcribeAudio(wavBuffer, 'audio/wav', {
      prompt: 'Transcribe this short audio clip. If silent, return silence or empty string.',
    });

    expect(result).toBeDefined();
    expect(result.provider).toBe('gemini');
    expect(typeof result.text).toBe('string');
    expect(Array.isArray(result.segments)).toBe(true);
  }, 20000);

  it('should successfully call Gemini meeting analysis API when configured', async () => {
    const provider = new GeminiAIAnalysisProvider();
    if (!provider.isAvailable()) {
      // If no key is set in test environment, skip live network call safely
      return;
    }

    const testPrompt = `Analyze this brief dialogue and return JSON matching: {"overview": string, "keyPoints": string[], "decisions": string[], "topics": string[], "actionItems": []}\nDialogue:\nAlex: Let's finalize the proposal today.\nSam: Agreed.`;

    const rawJson = await provider.generateMeetingAnalysis(
      {
        meetingTitle: 'Test Meeting',
        roomId: 'test-room',
        participants: [{ name: 'Alex' }, { name: 'Sam' }],
        transcriptText: "Alex: Let's finalize the proposal today.\nSam: Agreed.",
      },
      testPrompt
    );

    expect(rawJson).toBeDefined();
    const parsed = JSON.parse(rawJson);
    expect(parsed).toHaveProperty('overview');
    expect(Array.isArray(parsed.keyPoints)).toBe(true);
    expect(Array.isArray(parsed.decisions)).toBe(true);
  }, 20000);
});
