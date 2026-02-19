import { LogEntry, LogLevel } from '../types';

export const parseLogFile = (content: string, fileId: string): LogEntry[] => {
  const lines = content.split('\n');
  const entries: LogEntry[] = [];
  let currentEntry: LogEntry | null = null;

  // Regex breakdown:
  // 1: Date (YYYY-MM-DD)
  // 2: Time (HH:MM:SS.mmm)
  // 3: PID-TID (or similar identifier without spaces)
  // 4: Tag/Component (lazy match up to 200 chars to prevent ReDoS)
  // 5: Level (V, D, I, W, E, F, A)
  // 6: Message
  const regex = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+(\S+)\s+(.{1,200}?)\s+([VDIWEFA])\s+(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && i === lines.length - 1) continue; // Skip trailing empty line

    const match = line.match(regex);
    if (match) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      
      const date = match[1];
      const time = match[2];
      
      // Calculate a rough timestamp for sorting
      let timestamp = 0;
      try {
        timestamp = new Date(`${date}T${time}Z`).getTime();
      } catch (e) {
        timestamp = i; // fallback to line number
      }

      currentEntry = {
        id: `${fileId}-${i}`,
        fileId,
        date,
        time,
        timestamp,
        pidTid: match[3],
        tag: match[4].replace(/\s+/g, ' ').trim(), // compress multiple spaces
        level: (match[5] === 'F' ? 'E' : match[5]) as LogLevel, // Map F (Fatal) to Error
        message: match[6],
        raw: line
      };
    } else if (currentEntry) {
      // Continuation of previous line (e.g., stack traces)
      currentEntry.message += '\n' + line;
      currentEntry.raw += '\n' + line;
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};