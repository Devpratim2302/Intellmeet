import { config } from '../../../config/env.js';
import { IAICompletionProvider, MeetingAnalysisInput } from '../ai.types.js';

export class GeminiAIAnalysisProvider implements IAICompletionProvider {
  readonly name = 'gemini';

  isAvailable(): boolean {
    return Boolean(config.ai.geminiApiKey && config.ai.geminiApiKey.trim().length > 0);
  }

  async generateMeetingAnalysis(
    _input: MeetingAnalysisInput,
    prompt: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error(
        'Gemini API key is missing. Configure GEMINI_API_KEY in server/.env or switch AI_PROVIDER=mock for local development.'
      );
    }

    const apiKey = config.ai.geminiApiKey;
    const model = config.ai.model || 'gemini-3.5-flash-lite';

    console.log(`[GeminiAIAnalysisProvider] Requesting meeting analysis from Gemini (${model})...`);

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
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini meeting analysis API failed with status ${response.status}: ${errorText}`);
    }

    const data: any = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Gemini returned an empty completion response for meeting analysis');
    }

    return content;
  }
}
