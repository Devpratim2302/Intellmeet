import { config } from '../../../config/env.js';
import { IAICompletionProvider, MeetingAnalysisInput } from '../ai.types.js';

export class OpenAIAIAnalysisProvider implements IAICompletionProvider {
  readonly name = 'openai';

  isAvailable(): boolean {
    return Boolean(config.ai.openaiApiKey && config.ai.openaiApiKey.trim().length > 0);
  }

  async generateMeetingAnalysis(
    _input: MeetingAnalysisInput,
    prompt: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error(
        'OpenAI API key is missing. Configure OPENAI_API_KEY in server/.env or switch AI_PROVIDER=mock for local development.'
      );
    }

    const apiKey = config.ai.openaiApiKey;
    const model = config.ai.model || 'gpt-4o-mini';

    console.log(`[OpenAIAIAnalysisProvider] Requesting meeting analysis from OpenAI (${model})...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI meeting intelligence engine. You respond exclusively in valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for grounded analysis
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API chat completion failed with status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned an empty completion response');
    }

    return content;
  }
}
