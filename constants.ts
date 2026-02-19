import { LogLevel } from './types';

// Using non-conflicting colors (avoiding pure Blue, Emerald, Amber, Rose, Purple which are used for levels)
export const FILE_COLORS = [
  'bg-teal-600',
  'bg-fuchsia-600',
  'bg-orange-600',
  'bg-lime-600',
  'bg-pink-600',
  'bg-cyan-600',
  'bg-violet-600',
];

export const LEVEL_COLORS: Record<LogLevel, string> = {
  V: 'text-gray-300 bg-gray-300/10 border-gray-300/20',
  D: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  I: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  W: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  E: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  A: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
};

export const LEVEL_ROW_BG: Record<LogLevel, string> = {
  V: 'bg-transparent hover:bg-gray-800/50',
  D: 'bg-blue-900/10 hover:bg-blue-900/20',
  I: 'bg-emerald-900/10 hover:bg-emerald-900/20',
  W: 'bg-amber-900/10 hover:bg-amber-900/20',
  E: 'bg-rose-900/10 hover:bg-rose-900/20',
  A: 'bg-purple-900/10 hover:bg-purple-900/20',
};

export const LEVEL_HIGHLIGHT_BG: Record<LogLevel, string> = {
  V: 'bg-gray-800/80',
  D: 'bg-blue-900/60',
  I: 'bg-emerald-900/60',
  W: 'bg-amber-900/60',
  E: 'bg-rose-900/60',
  A: 'bg-purple-900/60',
};

export const LEVEL_HIGHLIGHT_RING: Record<LogLevel, string> = {
  V: 'ring-gray-500',
  D: 'ring-blue-500',
  I: 'ring-emerald-500',
  W: 'ring-amber-500',
  E: 'ring-rose-500',
  A: 'ring-purple-500',
};

export const LEVEL_SEVERITY: Record<LogLevel, number> = {
  V: 1,
  D: 2,
  I: 3,
  W: 4,
  E: 5,
  A: 6,
};

export const LEVEL_LABELS: Record<LogLevel, string> = {
  V: 'VERBOSE',
  D: 'DEBUG',
  I: 'INFO',
  W: 'WARN',
  E: 'ERROR',
  A: 'ASSERT',
};

export const ALL_LEVELS: LogLevel[] = ['V', 'D', 'I', 'W', 'E', 'A'];