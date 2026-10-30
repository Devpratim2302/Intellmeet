import { TranscriptSegment } from '../types/transcript.types';
import { ActionItem, MeetingSummary } from '../types/summary.types';
import { Task } from '../types/task.types';

export interface MeetingExportData {
  title: string;
  roomId: string;
  hostName?: string;
  date?: string;
  summary?: MeetingSummary | null;
  actionItems?: ActionItem[];
  tasks?: Task[];
  segments?: TranscriptSegment[];
}

/**
 * Clean sanitization for filenames
 */
export const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80);
};

/**
 * 1. Download as Text (.txt)
 */
export const downloadMeetingAsTxt = (data: MeetingExportData, customFilename?: string) => {
  const title = data.title || 'Meeting';
  const filename = customFilename || `${sanitizeFilename(title)}_report.txt`;

  let text = '';
  text += '================================================================================\n';
  text += `                     INTELLMEET MEETING REPORT & NOTES\n`;
  text += '================================================================================\n';
  text += `Title       : ${title}\n`;
  text += `Room Code   : ${data.roomId}\n`;
  text += `Host        : ${data.hostName || 'Meeting Host'}\n`;
  text += `Date        : ${data.date || new Date().toLocaleString()}\n`;
  text += `Exported At : ${new Date().toLocaleString()}\n`;
  text += '================================================================================\n\n';

  if (data.summary) {
    text += '--------------------------------------------------------------------------------\n';
    text += '1. EXECUTIVE SUMMARY & KEY TAKEAWAYS\n';
    text += '--------------------------------------------------------------------------------\n';
    if (data.summary.overview) {
      text += `${data.summary.overview}\n\n`;
    }
    if (data.summary.keyPoints && data.summary.keyPoints.length > 0) {
      text += 'Key Discussion Points:\n';
      data.summary.keyPoints.forEach((point: string, i: number) => {
        text += `  ${i + 1}. ${point}\n`;
      });
      text += '\n';
    }
    if (data.summary.decisions && data.summary.decisions.length > 0) {
      text += 'Agreed Decisions:\n';
      data.summary.decisions.forEach((dec: string) => {
        text += `  * ${dec}\n`;
      });
      text += '\n';
    }
  }

  const items = data.actionItems || [];
  if (items.length > 0) {
    text += '--------------------------------------------------------------------------------\n';
    text += '2. ACTION ITEMS & NEXT STEPS\n';
    text += '--------------------------------------------------------------------------------\n';
    items.forEach((item, i) => {
      const statusMark = item.status === 'completed' ? '[X]' : '[ ]';
      const assignee = item.assigneeName ? ` (Assignee: ${item.assigneeName})` : '';
      const priority = item.priority ? ` [Priority: ${item.priority.toUpperCase()}]` : '';
      text += `${statusMark} ${i + 1}. ${item.title}${priority}${assignee}\n`;
      if (item.description) {
        text += `     Details: ${item.description}\n`;
      }
    });
    text += '\n';
  }

  const segs = data.segments || [];
  text += '--------------------------------------------------------------------------------\n';
  text += `3. FULL MEETING TRANSCRIPT (${segs.length} Segments)\n`;
  text += '--------------------------------------------------------------------------------\n';
  if (segs.length === 0) {
    text += 'No audio transcription segments recorded for this session.\n';
  } else {
    segs.forEach((seg) => {
      const time = seg.timestamp ? `[${new Date(seg.timestamp).toLocaleTimeString()}] ` : '';
      const speaker = seg.speaker?.name || 'Speaker';
      text += `${time}${speaker}: ${seg.text}\n\n`;
    });
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 2. Download as Markdown (.md)
 */
export const downloadMeetingAsMd = (data: MeetingExportData, customFilename?: string) => {
  const title = data.title || 'Meeting';
  const filename = customFilename || `${sanitizeFilename(title)}_report.md`;

  let md = '';
  md += `# ${title}\n\n`;
  md += `| Property | Details |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Room Code** | \`${data.roomId}\` |\n`;
  md += `| **Host** | ${data.hostName || 'Meeting Host'} |\n`;
  md += `| **Meeting Date** | ${data.date || new Date().toLocaleDateString()} |\n`;
  md += `| **Exported On** | ${new Date().toLocaleString()} |\n\n`;
  md += `---\n\n`;

  if (data.summary) {
    md += `## 📝 Executive Summary\n\n`;
    if (data.summary.overview) {
      md += `${data.summary.overview}\n\n`;
    }

    if (data.summary.keyPoints && data.summary.keyPoints.length > 0) {
      md += `### Key Discussion Points\n\n`;
      data.summary.keyPoints.forEach((point: string) => {
        md += `- ${point}\n`;
      });
      md += `\n`;
    }

    if (data.summary.decisions && data.summary.decisions.length > 0) {
      md += `### Key Decisions\n\n`;
      data.summary.decisions.forEach((dec: string) => {
        md += `- ✅ **Decision:** ${dec}\n`;
      });
      md += `\n`;
    }
  }

  const items = data.actionItems || [];
  if (items.length > 0) {
    md += `## 🎯 Action Items & Next Steps\n\n`;
    items.forEach((item) => {
      const isChecked = item.status === 'completed' ? 'x' : ' ';
      const assignee = item.assigneeName ? ` — *@${item.assigneeName}*` : '';
      const priority = item.priority ? ` \`[${item.priority.toUpperCase()}]\`` : '';
      md += `- [${isChecked}] **${item.title}**${priority}${assignee}\n`;
      if (item.description) {
        md += `  > ${item.description}\n`;
      }
    });
    md += `\n`;
  }

  const segs = data.segments || [];
  md += `## 🎙️ Chronological Meeting Transcript\n\n`;
  if (segs.length === 0) {
    md += `*No transcript segments recorded for this meeting session.*\n`;
  } else {
    segs.forEach((seg) => {
      const time = seg.timestamp ? `\`[${new Date(seg.timestamp).toLocaleTimeString()}]\` ` : '';
      const speaker = seg.speaker?.name || 'Speaker';
      md += `${time}**${speaker}:** ${seg.text}\n\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 3. Download as PDF (.pdf) - Native high-compatibility PDF 1.4 generator
 */
export const downloadMeetingAsPdf = (data: MeetingExportData, customFilename?: string) => {
  const title = data.title || 'Meeting';
  const filename = customFilename || `${sanitizeFilename(title)}_report.pdf`;

  // Prepare formatted textual lines with wrapping for standard Letter size (8.5 x 11 in)
  const maxLineChars = 75;

  const wrapText = (text: string, prefix = ''): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = prefix;

    for (const w of words) {
      if ((current + ' ' + w).trim().length <= maxLineChars) {
        current = current ? current + ' ' + w : w;
      } else {
        if (current) lines.push(current);
        current = '   ' + w;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const contentLines: string[] = [];

  // Metadata block
  contentLines.push(`ROOM CODE: ${data.roomId}`);
  contentLines.push(`HOST: ${data.hostName || 'Meeting Host'}`);
  contentLines.push(`DATE: ${data.date || new Date().toLocaleString()}`);
  contentLines.push(`EXPORT DATE: ${new Date().toLocaleString()}`);
  contentLines.push('----------------------------------------------------------------------');
  contentLines.push('');

  // Executive Summary
  if (data.summary) {
    contentLines.push('EXECUTIVE SUMMARY:');
    if (data.summary.overview) {
      wrapText(data.summary.overview).forEach((l) => contentLines.push(l));
      contentLines.push('');
    }

    if (data.summary.keyPoints && data.summary.keyPoints.length > 0) {
      contentLines.push('KEY DISCUSSION TOPICS:');
      data.summary.keyPoints.forEach((point: string, i: number) => {
        wrapText(point, `${i + 1}. `).forEach((l) => contentLines.push(l));
      });
      contentLines.push('');
    }

    if (data.summary.decisions && data.summary.decisions.length > 0) {
      contentLines.push('AGREED DECISIONS:');
      data.summary.decisions.forEach((dec: string) => {
        wrapText(dec, `* `).forEach((l) => contentLines.push(l));
      });
      contentLines.push('');
    }
  }

  // Action Items
  const items = data.actionItems || [];
  if (items.length > 0) {
    contentLines.push('ACTION ITEMS & TASKS:');
    items.forEach((item, i) => {
      const mark = item.status === 'completed' ? '[X]' : '[ ]';
      const assignee = item.assigneeName ? ` (Assignee: ${item.assigneeName})` : '';
      const prio = item.priority ? ` [Priority: ${item.priority.toUpperCase()}]` : '';
      wrapText(`${item.title}${prio}${assignee}`, `${mark} ${i + 1}. `).forEach((l) =>
        contentLines.push(l)
      );
      if (item.description) {
        wrapText(item.description, '     Note: ').forEach((l) => contentLines.push(l));
      }
    });
    contentLines.push('');
  }

  // Transcript
  const segs = data.segments || [];
  contentLines.push(`MEETING DIALOGUE TRANSCRIPT (${segs.length} Segments):`);
  contentLines.push('----------------------------------------------------------------------');
  if (segs.length === 0) {
    contentLines.push('No dialogue segments recorded for this meeting session.');
  } else {
    segs.forEach((seg) => {
      const time = seg.timestamp ? `[${new Date(seg.timestamp).toLocaleTimeString()}] ` : '';
      const speaker = seg.speaker?.name || 'Speaker';
      wrapText(seg.text, `${time}${speaker}: `).forEach((l) => contentLines.push(l));
    });
  }

  // Paginate lines into 42 lines per page
  const linesPerPage = 42;
  const pages: string[][] = [];
  for (let i = 0; i < contentLines.length; i += linesPerPage) {
    pages.push(contentLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([title]);

  // Construct PDF 1.4 objects
  let objIdx = 1;
  const catalogObj = objIdx++;
  const pagesObj = objIdx++;
  const fontObj = objIdx++;
  const fontBoldObj = objIdx++;

  const pageObjIds: number[] = [];
  const streamObjIds: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    pageObjIds.push(objIdx++);
    streamObjIds.push(objIdx++);
  }

  const objects: string[] = [];

  objects[catalogObj] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[fontObj] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[fontBoldObj] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  const cleanText = (str: string) => str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  for (let p = 0; p < pages.length; p++) {
    const pageId = pageObjIds[p];
    const streamId = streamObjIds[p];
    objects[pageId] = `<< /Type /Page /Parent ${pagesObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${fontBoldObj} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${streamId} 0 R >>`;

    let streamContent = 'BT\n';
    // Document Title & Page numbering
    streamContent += `/F2 15 Tf\n54 742 Td\n(${cleanText(title)}) Tj\n`;
    streamContent += `/F1 8.5 Tf\n0 -13 Td\n(IntellMeet Verified Summary - Page ${p + 1} of ${pages.length}) Tj\n`;
    streamContent += 'ET\n';

    // Thin accent dividing line below header
    streamContent += '0.5 w\n0.7 0.7 0.7 RG\n54 718 m\n558 718 l\nS\n';

    // Page body lines
    streamContent += 'BT\n/F1 9.5 Tf\n54 698 Td\n13.5 TL\n';
    const lines = pages[p];
    for (let l = 0; l < lines.length; l++) {
      const sanitized = cleanText(lines[l]);
      if (l === 0) {
        streamContent += `(${sanitized}) Tj\n`;
      } else {
        streamContent += `T* (${sanitized}) Tj\n`;
      }
    }
    streamContent += 'ET\n';

    const byteLen = new TextEncoder().encode(streamContent).length;
    objects[streamId] = `<< /Length ${byteLen} >>\nstream\n${streamContent}endstream`;
  }

  // Assemble full PDF document
  let pdfString = '%PDF-1.4\n';
  const xrefOffsets: number[] = [0];

  for (let i = 1; i < objIdx; i++) {
    xrefOffsets[i] = new TextEncoder().encode(pdfString).length;
    pdfString += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = new TextEncoder().encode(pdfString).length;
  pdfString += `xref\n0 ${objIdx}\n`;
  pdfString += '0000000000 65535 f \n';
  for (let i = 1; i < objIdx; i++) {
    pdfString += String(xrefOffsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdfString += `trailer\n<< /Size ${objIdx} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([new TextEncoder().encode(pdfString)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
