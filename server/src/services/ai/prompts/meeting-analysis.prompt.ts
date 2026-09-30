import { MeetingAnalysisInput } from '../ai.types.js';

export const buildMeetingAnalysisPrompt = (input: MeetingAnalysisInput): string => {
  const participantsList = input.participants.length > 0
    ? input.participants.map((p) => `- ${p.name} (${p.email || 'No email'})`).join('\n')
    : '- Unspecified participants';

  return `You are an expert AI meeting analyst for IntellMeet.
Your task is to analyze the meeting transcript below and produce an accurate, objective, and structured summary along with extracted action items.

CRITICAL INSTRUCTIONS:
1. Grounding: Do NOT make unsupported claims. Everything in your summary, discussion points, decisions, and action items must be directly grounded in the provided transcript.
2. If no decisions were made, return an empty array for decisions. Do not fabricate consensus.
3. For action items:
   - Identify explicit commitments, tasks, and follow-ups.
   - Only assign an assigneeName if a specific person agreed to do the task or was explicitly assigned.
   - Only assign a dueDate if a deadline was explicitly stated (e.g. "by Friday", "tomorrow", or a specific date). Otherwise leave dueDate null.
   - Include a sourceSnippet showing the relevant spoken quote.
4. Output MUST be valid, parseable JSON matching the schema below. No markdown wrappings, no conversational intro or outro.

JSON SCHEMA SPECIFICATION:
{
  "overview": "Concise 1-3 paragraph summary of what was discussed and the overall outcome.",
  "keyPoints": [
    "Key discussion point 1",
    "Key discussion point 2"
  ],
  "decisions": [
    "Explicit decision 1"
  ],
  "topics": [
    "Architecture",
    "Deployment"
  ],
  "actionItems": [
    {
      "title": "Clear actionable task summary",
      "description": "Optional context or details",
      "assigneeName": "Name of the assigned person or null if unassigned",
      "dueDate": "YYYY-MM-DD or null if not explicitly mentioned",
      "priority": "low | medium | high",
      "sourceSnippet": "Spoken quote from transcript that originated this task"
    }
  ]
}

MEETING CONTEXT:
Title: ${input.meetingTitle}
Room ID: ${input.roomId}
Participants:
${participantsList}

TRANSCRIPT:
"""
${input.transcriptText}
"""
`;
};
