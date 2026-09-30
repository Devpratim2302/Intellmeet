export interface RawActionItem {
  title: string;
  description?: string;
  assigneeName?: string;
  dueDate?: string; // ISO date string or relative text if explicitly stated
  priority?: 'low' | 'medium' | 'high';
  sourceSnippet?: string;
}

export interface RawMeetingAnalysisOutput {
  overview: string;
  keyPoints: string[];
  decisions: string[];
  topics: string[];
  actionItems: RawActionItem[];
}

export interface MeetingAnalysisInput {
  meetingTitle: string;
  roomId: string;
  participants: Array<{ name: string; email?: string }>;
  transcriptText: string;
  segments?: Array<{
    speakerName: string;
    text: string;
    timestamp: Date;
  }>;
}

export interface IAICompletionProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateMeetingAnalysis(
    input: MeetingAnalysisInput,
    prompt: string
  ): Promise<string>; // Returns raw JSON string from AI
}
