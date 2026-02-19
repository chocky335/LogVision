export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'A';

export interface LogEntry {
  id: string;
  fileId: string;
  date: string;
  time: string;
  timestamp: number; // For sorting
  pidTid: string;
  tag: string;
  level: LogLevel;
  message: string;
  raw: string;
}

export interface LogFile {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  entries: LogEntry[];
}

export interface FilterState {
  levels: Set<LogLevel>;
  search: string;
  tokens: Set<string>; // For tag/token filtering
  timeRange: { start: number; end: number } | null;
}

export type ColumnId = 'file' | 'time' | 'level' | 'pidTid' | 'tag' | 'message';

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  visible: boolean;
  width: number; // 0 means flex-grow
}

export interface SortConfig {
  column: ColumnId;
  direction: 'asc' | 'desc';
}