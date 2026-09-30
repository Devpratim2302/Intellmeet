import { config } from '../../config/env.js';
import { ITranscriptionProvider } from './transcription.types.js';
import { MockTranscriptionProvider } from './providers/mock.provider.js';
import { OpenAIWhisperProvider } from './providers/openai.provider.js';
import { DeepgramTranscriptionProvider } from './providers/deepgram.provider.js';

export class TranscriptionProviderFactory {
  private providers: Map<string, ITranscriptionProvider> = new Map();

  constructor() {
    this.registerProvider(new MockTranscriptionProvider());
    this.registerProvider(new OpenAIWhisperProvider());
    this.registerProvider(new DeepgramTranscriptionProvider());
  }

  registerProvider(provider: ITranscriptionProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(providerName?: string): ITranscriptionProvider {
    const selectedName = (providerName || config.transcription.provider || 'mock').toLowerCase();
    const candidate = this.providers.get(selectedName);

    if (candidate) {
      if (candidate.isAvailable()) {
        return candidate;
      }

      console.warn(
        `[TranscriptionProviderFactory] Configured provider "${selectedName}" is unavailable (missing credentials/API keys). Falling back to "mock" provider.`
      );
    } else {
      console.warn(
        `[TranscriptionProviderFactory] Unknown provider "${selectedName}". Falling back to "mock" provider.`
      );
    }

    const fallback = this.providers.get('mock');
    if (!fallback) {
      throw new Error('Fatal: Default mock transcription provider is not registered.');
    }
    return fallback;
  }

  listProviders(): Array<{ name: string; available: boolean; isDefault: boolean }> {
    const configuredName = (config.transcription.provider || 'mock').toLowerCase();
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      available: p.isAvailable(),
      isDefault: p.name === configuredName,
    }));
  }
}

export const transcriptionProviderFactory = new TranscriptionProviderFactory();
