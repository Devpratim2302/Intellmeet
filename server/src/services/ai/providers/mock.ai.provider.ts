import { IAICompletionProvider, MeetingAnalysisInput } from '../ai.types.js';

export class MockAIAnalysisProvider implements IAICompletionProvider {
  readonly name = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async generateMeetingAnalysis(
    input: MeetingAnalysisInput,
    _prompt: string
  ): Promise<string> {
    const text = input.transcriptText || '';
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    // Extract discussion sentences
    const cleanSentences: string[] = [];
    const speakerQuotes: Array<{ speaker: string; content: string }> = [];

    for (const line of lines) {
      const match = line.match(/(?:\[.*?\]\s*)?([^:]+):\s*(.+)/);
      if (match) {
        const speaker = match[1].trim();
        const content = match[2].trim();
        speakerQuotes.push({ speaker, content });
        cleanSentences.push(content);
      } else {
        cleanSentences.push(line.trim());
      }
    }

    // 1. Overview
    let overview: string;
    if (cleanSentences.length === 0) {
      overview = `The meeting "${input.meetingTitle}" was conducted. Minimal discussion content was recorded in the transcript.`;
    } else {
      const summaryContext = cleanSentences.slice(0, 3).join(' ');
      overview = `In this session regarding "${input.meetingTitle}", the team reviewed project progress and ongoing development objectives. Key focus areas included: ${summaryContext.slice(0, 200)}...`;
    }

    // 2. Key Discussion Points
    const keyPoints: string[] = [];
    if (speakerQuotes.length > 0) {
      speakerQuotes.slice(0, 4).forEach((sq) => {
        keyPoints.push(`${sq.speaker} discussed: "${sq.content.slice(0, 120)}"`);
      });
    } else {
      cleanSentences.slice(0, 3).forEach((s) => {
        keyPoints.push(s.slice(0, 120));
      });
    }
    if (keyPoints.length === 0) {
      keyPoints.push(`Initial review and kickoff of ${input.meetingTitle}.`);
    }

    // 3. Decisions
    const decisions: string[] = [];
    for (const sq of speakerQuotes) {
      const lower = sq.content.toLowerCase();
      if (
        lower.includes('decide') ||
        lower.includes('agreed') ||
        lower.includes('approved') ||
        lower.includes('concluded') ||
        lower.includes('will use') ||
        lower.includes('chosen')
      ) {
        decisions.push(`${sq.speaker}: ${sq.content}`);
      }
    }

    // 4. Important Topics
    const topicsSet = new Set<string>();
    topicsSet.add('Project Collaboration');
    const lowerFullText = text.toLowerCase();
    if (lowerFullText.includes('webrtc') || lowerFullText.includes('audio') || lowerFullText.includes('video')) {
      topicsSet.add('WebRTC & Audio');
    }
    if (lowerFullText.includes('transcript') || lowerFullText.includes('speech') || lowerFullText.includes('stt')) {
      topicsSet.add('Speech AI');
    }
    if (lowerFullText.includes('database') || lowerFullText.includes('mongo') || lowerFullText.includes('schema')) {
      topicsSet.add('Database Architecture');
    }
    if (lowerFullText.includes('sprint') || lowerFullText.includes('testing') || lowerFullText.includes('test')) {
      topicsSet.add('QA & Verification');
    }
    if (lowerFullText.includes('workspace') || lowerFullText.includes('team') || lowerFullText.includes('role')) {
      topicsSet.add('Team Workspace');
    }

    // 5. Action Items
    const actionItems: Array<{
      title: string;
      description?: string;
      assigneeName?: string;
      dueDate?: string;
      priority?: 'low' | 'medium' | 'high';
      sourceSnippet?: string;
    }> = [];

    // Scan speaker quotes for commitments (e.g. "I will", "we need to", "deploy", "complete", "test", "prepare")
    const actionRegex = /(?:i will|we will|we need to|please|action item|task:|should|must|assigned to)\s+([^.!?]+)/i;

    for (const sq of speakerQuotes) {
      const match = sq.content.match(actionRegex);
      if (match) {
        const rawAction = match[1].trim();
        const lowerQuote = sq.content.toLowerCase();

        let dueDate: string | undefined = undefined;
        if (lowerQuote.includes('tomorrow')) {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          dueDate = d.toISOString().split('T')[0];
        } else if (lowerQuote.includes('friday')) {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          dueDate = d.toISOString().split('T')[0];
        } else if (lowerQuote.includes('end of day') || lowerQuote.includes('eod')) {
          dueDate = new Date().toISOString().split('T')[0];
        }

        const priority: 'low' | 'medium' | 'high' = lowerQuote.includes('urgent') || lowerQuote.includes('asap')
          ? 'high'
          : 'medium';

        actionItems.push({
          title: rawAction.length > 5 ? rawAction.charAt(0).toUpperCase() + rawAction.slice(1) : `Follow up on ${rawAction}`,
          description: `Identified from discussion regarding "${input.meetingTitle}".`,
          assigneeName: sq.speaker,
          dueDate,
          priority,
          sourceSnippet: sq.content,
        });
      }
    }

    // If no action items matched naturally but transcript exists, derive one if appropriate
    if (actionItems.length === 0 && speakerQuotes.length > 0) {
      const first = speakerQuotes[0];
      actionItems.push({
        title: `Review and verify notes for ${input.meetingTitle}`,
        description: 'Auto-generated follow-up task based on meeting discussion.',
        assigneeName: first.speaker,
        priority: 'medium',
        sourceSnippet: first.content,
      });
    }

    const payload = {
      overview,
      keyPoints,
      decisions,
      topics: Array.from(topicsSet),
      actionItems,
    };

    console.log(
      `[MockAIAnalysisProvider] Generated analysis with ${keyPoints.length} key points, ${decisions.length} decisions, and ${actionItems.length} action items.`
    );

    return JSON.stringify(payload, null, 2);
  }
}
