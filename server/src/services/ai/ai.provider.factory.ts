import { config } from '../../config/env.js';
import { IAICompletionProvider } from './ai.types.js';
import { MockAIAnalysisProvider } from './providers/mock.ai.provider.js';
import { OpenAIAIAnalysisProvider } from './providers/openai.ai.provider.js';

export class AIProviderFactory {
  private providers: Map<string, IAICompletionProvider> = new Map();

  constructor() {
    this.registerProvider(new MockAIAnalysisProvider());
    this.registerProvider(new OpenAIAIAnalysisProvider());
  }

  registerProvider(provider: IAICompletionProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(providerName?: string): IAICompletionProvider {
    const selectedName = (providerName || config.ai.provider || 'mock').toLowerCase();
    const candidate = this.providers.get(selectedName);

    if (candidate) {
      if (candidate.isAvailable()) {
        return candidate;
      }
      console.warn(
        `[AIProviderFactory] Configured AI provider "${selectedName}" is unavailable (missing API key). Falling back to "mock" provider.`
      );
    } else {
      console.warn(
        `[AIProviderFactory] Unknown AI provider "${selectedName}". Falling back to "mock" provider.`
      );
    }

    const fallback = this.providers.get('mock');
    if (!fallback) {
      throw new Error('Fatal: Default mock AI provider is not registered.');
    }
    return fallback;
  }

  listProviders(): Array<{ name: string; available: boolean; isDefault: boolean }> {
    const configured = (config.ai.provider || 'mock').toLowerCase();
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      available: p.isAvailable(),
      isDefault: p.name === configured,
    }));
  }
}

export const aiProviderFactory = new AIProviderFactory();
