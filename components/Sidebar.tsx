import React, { useState } from 'react';
import { LogFile, FilterState, LogLevel } from '../types';
import { ALL_LEVELS, LEVEL_COLORS, LEVEL_LABELS } from '../constants';
import { FileIcon, XIcon, EyeIcon, EyeOffIcon, SearchIcon, ActivityIcon, UploadIcon, ChevronDownIcon, ChevronRightIcon, DownloadIcon, SparklesIcon } from './Icons';

interface SidebarProps {
  files: LogFile[];
  availableTokens: string[];
  timeBounds: { min: number; max: number } | null;
  isSameDay: boolean;
  onToggleFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  filters: FilterState;
  onUpdateFilters: (filters: FilterState) => void;
  onFilesAdded: (files: FileList) => void;
  onExportLogs: () => void;
  onCopyAIPrompt: (anonymize: boolean, customStrings: string[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  availableTokens,
  timeBounds,
  isSameDay,
  onToggleFile,
  onRemoveFile,
  filters,
  onUpdateFilters,
  onFilesAdded,
  onExportLogs,
  onCopyAIPrompt
}) => {
  const [tokensExpanded, setTokensExpanded] = useState(false);
  const [anonymizeAI, setAnonymizeAI] = useState(true);
  const [customStrings, setCustomStrings] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleLevelToggle = (level: LogLevel) => {
    const newLevels = new Set(filters.levels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    onUpdateFilters({ ...filters, levels: newLevels });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilters({ ...filters, search: e.target.value });
  };

  const handleTokenToggle = (token: string) => {
    const newTokens = new Set(filters.tokens);
    if (newTokens.has(token)) {
      newTokens.delete(token);
    } else {
      newTokens.add(token);
    }
    onUpdateFilters({ ...filters, tokens: newTokens });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
    // Reset input so the same file can be selected again if removed
    e.target.value = '';
  };

  const formatTs = (ts: number) => {
    if (ts < 1000000000) return String(ts);
    const d = new Date(ts);
    const timeStr = d.toISOString().substr(11, 8); // HH:mm:ss
    if (isSameDay) return timeStr;
    return `${d.toISOString().substr(5, 5)} ${timeStr}`; // MM-DD HH:mm:ss
  };

  const handleAddCustomString = () => {
    if (customInput.trim()) {
      setCustomStrings(prev => Array.from(new Set([...prev, customInput.trim()])));
      setCustomInput('');
    }
  };

  const handleCopy = () => {
    onCopyAIPrompt(anonymizeAI, customStrings);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-80 flex-none bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* App Title */}
      <div className="p-5 border-b border-gray-800 flex items-center gap-3">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
          <ActivityIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">LogVision</h1>
          <p className="text-xs text-gray-500">Cross-platform Log Analyzer</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        
        {/* Search */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search</h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md leading-5 bg-gray-950 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Filter by message or tag..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Time Range */}
        {timeBounds && timeBounds.min !== timeBounds.max && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Range</h3>
              {filters.timeRange && (
                <button 
                  onClick={() => onUpdateFilters({ ...filters, timeRange: null })}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            
            <div className="px-1 pt-2 pb-1">
              <div className="relative h-4 flex items-center">
                <div className="absolute w-full h-1 bg-gray-700 rounded" />
                <div 
                  className="absolute h-1 bg-blue-500 rounded" 
                  style={{ 
                    left: `${(((filters.timeRange?.start ?? timeBounds.min) - timeBounds.min) / (timeBounds.max - timeBounds.min)) * 100}%`, 
                    right: `${100 - (((filters.timeRange?.end ?? timeBounds.max) - timeBounds.min) / (timeBounds.max - timeBounds.min)) * 100}%` 
                  }} 
                />
                <input 
                  type="range" 
                  min={timeBounds.min} 
                  max={timeBounds.max} 
                  value={filters.timeRange?.start ?? timeBounds.min} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const end = filters.timeRange?.end ?? timeBounds.max;
                    onUpdateFilters({ ...filters, timeRange: { start: Math.min(val, end), end } });
                  }} 
                  className="dual-range absolute w-full appearance-none bg-transparent pointer-events-none" 
                />
                <input 
                  type="range" 
                  min={timeBounds.min} 
                  max={timeBounds.max} 
                  value={filters.timeRange?.end ?? timeBounds.max} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const start = filters.timeRange?.start ?? timeBounds.min;
                    onUpdateFilters({ ...filters, timeRange: { start, end: Math.max(val, start) } });
                  }} 
                  className="dual-range absolute w-full appearance-none bg-transparent pointer-events-none" 
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono whitespace-nowrap overflow-hidden">
                <span className="truncate pr-1">{formatTs(filters.timeRange?.start ?? timeBounds.min)}</span>
                <span className="truncate pl-1">{formatTs(filters.timeRange?.end ?? timeBounds.max)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Log Levels */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Levels</h3>
          <div className="grid grid-cols-2 gap-2">
            {ALL_LEVELS.map(level => {
              const isActive = filters.levels.has(level);
              return (
                <button
                  key={level}
                  onClick={() => handleLevelToggle(level)}
                  className={`flex items-center justify-center px-3 py-1.5 rounded text-sm font-medium transition-colors border ${
                    isActive 
                      ? LEVEL_COLORS[level]
                      : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags / Tokens */}
        <div className="space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setTokensExpanded(!tokensExpanded)}
          >
            <div className="flex items-center gap-1">
              {tokensExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-300 transition-colors">
                Tags / Tokens
              </h3>
            </div>
            {filters.tokens.size > 0 && (
              <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {filters.tokens.size}
              </span>
            )}
          </div>

          {tokensExpanded && (
            <div className="pl-6 max-h-48 overflow-y-auto space-y-1 pr-2">
              {availableTokens.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No tags found.</p>
              ) : (
                availableTokens.map(token => (
                  <label key={token} className="flex items-center space-x-2 p-1.5 hover:bg-gray-800 rounded cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={filters.tokens.has(token)} 
                      onChange={() => handleTokenToggle(token)} 
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-900"
                    />
                    <span className="text-sm text-gray-300 truncate" title={token}>{token}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Loaded Files</h3>
            <span className="bg-gray-800 text-gray-300 text-xs py-0.5 px-2 rounded-full">{files.length}</span>
          </div>
          
          <div className="space-y-2">
            {files.map(file => (
              <div 
                key={file.id} 
                className={`flex items-center justify-between p-2 rounded-md border ${
                  file.visible ? 'bg-gray-800 border-gray-700' : 'bg-gray-900 border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-3 h-3 rounded-full flex-none ${file.color}`}></div>
                  <div className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-none text-gray-400">
                  <button 
                    onClick={() => onToggleFile(file.id)}
                    className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title={file.visible ? "Hide logs" : "Show logs"}
                  >
                    {file.visible ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                    title="Remove file"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {files.length === 0 && (
              <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                <p className="text-sm text-gray-500">No files loaded.</p>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Actions */}
      <div className="p-5 border-t border-gray-800 bg-gray-900/50 space-y-3">
        <label className="flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
          <UploadIcon className="w-4 h-4 mr-2" />
          Open Files...
          <input 
            type="file" 
            multiple 
            className="hidden" 
            onChange={handleFileChange}
            accept=".txt,.log,text/plain"
          />
        </label>

        {files.length > 0 && (
          <div className="pt-2 space-y-3 border-t border-gray-800">
            <button
              onClick={onExportLogs}
              className="flex items-center justify-center w-full px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export Filtered Logs
            </button>

            <div className="border border-indigo-900/30 bg-indigo-900/10 rounded-md p-3 space-y-3">
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={anonymizeAI}
                  onChange={(e) => setAnonymizeAI(e.target.checked)}
                  className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-900 mt-0.5"
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                  Anonymize Data (IPs, Emails, UUIDs, Hashes)
                </span>
              </label>

              {anonymizeAI && (
                <div className="pl-6 space-y-2">
                  <div className="flex gap-1">
                    <input 
                      type="text"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddCustomString();
                      }}
                      placeholder="Extra string to hide..."
                      className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={handleAddCustomString}
                      className="bg-gray-800 border border-gray-700 rounded px-2 text-[11px] font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {customStrings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {customStrings.map(s => (
                        <span key={s} className="bg-indigo-900/40 border border-indigo-800/50 text-indigo-300 text-[10px] pl-1.5 pr-1 py-0.5 rounded flex items-center gap-1">
                          <span className="truncate max-w-[120px]" title={s}>{s}</span>
                          <button 
                            onClick={() => setCustomStrings(prev => prev.filter(x => x !== s))} 
                            className="hover:text-indigo-100 hover:bg-indigo-800/50 rounded p-0.5 transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                {isCopied ? "Copied!" : "Copy AI Prompt"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
