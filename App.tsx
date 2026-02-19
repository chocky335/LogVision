import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { LogFile, FilterState, SortConfig, ColumnId } from './types';
import { FILE_COLORS, ALL_LEVELS, LEVEL_SEVERITY } from './constants';
import { parseLogFile } from './utils/parser';
import { Sidebar } from './components/Sidebar';
import { LogViewer } from './components/LogViewer';
import { UploadIcon } from './components/Icons';

// Max file size 100MB to prevent out-of-memory browser crashes
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function App() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    levels: new Set(ALL_LEVELS),
    search: '',
    tokens: new Set(),
    timeRange: null,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'time',
    direction: 'asc'
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    setIsLoading(true);
    
    // Process files sequentially to avoid blocking the main thread too long
    // In a real robust app, this could be a Web Worker
    const newLogFiles: LogFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large. Max size is 100MB to prevent browser crashes.`);
        continue;
      }

      const text = await file.text();
      const fileId = `file-${Date.now()}-${i}`;
      
      const entries = parseLogFile(text, fileId);
      
      if (entries.length > 0) {
        newLogFiles.push({
          id: fileId,
          name: file.name,
          // Assign a deterministic but varied color based on current file count
          color: FILE_COLORS[(files.length + i) % FILE_COLORS.length],
          visible: true,
          entries,
        });
      }
    }

    if (newLogFiles.length > 0) {
      setFiles(prev => [...prev, ...newLogFiles]);
    }
    
    setIsLoading(false);
  }, [files.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const toggleFileVisibility = useCallback((id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleSort = useCallback((columnId: ColumnId) => {
    setSortConfig(prev => {
      if (prev.column === columnId) {
        return { column: columnId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column: columnId, direction: 'asc' };
    });
  }, []);

  // Compute available tokens (tags) from visible files
  const availableTokens = useMemo(() => {
    const tokens = new Set<string>();
    files.forEach(f => {
      if (f.visible) {
        f.entries.forEach(e => tokens.add(e.tag));
      }
    });
    return Array.from(tokens).sort();
  }, [files]);

  // Compute global time bounds for visible files
  const timeBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    files.forEach(f => {
      if (f.visible) {
        f.entries.forEach(e => {
          if (e.timestamp < min) min = e.timestamp;
          if (e.timestamp > max) max = e.timestamp;
        });
      }
    });
    return min === Infinity ? null : { min, max };
  }, [files]);

  // Check if logs are isolated within a single day for formatting
  const isSameDay = useMemo(() => {
    if (!timeBounds) return true;
    const d1 = new Date(timeBounds.min);
    const d2 = new Date(timeBounds.max);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }, [timeBounds]);

  // Reset or clamp timeRange if bounds change
  useEffect(() => {
    if (timeBounds && filters.timeRange) {
      if (filters.timeRange.end < timeBounds.min || filters.timeRange.start > timeBounds.max) {
        setFilters(prev => ({ ...prev, timeRange: null }));
      } else {
        let newStart = Math.max(timeBounds.min, filters.timeRange.start);
        let newEnd = Math.min(timeBounds.max, filters.timeRange.end);
        if (newStart !== filters.timeRange.start || newEnd !== filters.timeRange.end) {
          setFilters(prev => ({ ...prev, timeRange: { start: newStart, end: newEnd } }));
        }
      }
    } else if (!timeBounds && filters.timeRange) {
      setFilters(prev => ({ ...prev, timeRange: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeBounds]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    // 1. Gather all entries from visible files
    const visibleFiles = files.filter(f => f.visible);
    if (visibleFiles.length === 0) return [];
    
    let allEntries = visibleFiles.flatMap(f => f.entries);

    // 2. Apply Filters
    if (filters.levels.size < ALL_LEVELS.length) {
      allEntries = allEntries.filter(e => filters.levels.has(e.level));
    }

    if (filters.tokens.size > 0) {
      allEntries = allEntries.filter(e => filters.tokens.has(e.tag));
    }

    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      allEntries = allEntries.filter(e => e.timestamp >= start && e.timestamp <= end);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      allEntries = allEntries.filter(e => 
        e.message.toLowerCase().includes(q) || 
        e.tag.toLowerCase().includes(q) ||
        e.pidTid.includes(q)
      );
    }

    // 3. Sort
    const fileMap = new Map<string, string>(files.map(f => [f.id, f.name]));
    
    allEntries.sort((a, b) => {
      let cmp = 0;
      switch (sortConfig.column) {
        case 'time':
          cmp = a.timestamp - b.timestamp;
          break;
        case 'level':
          cmp = LEVEL_SEVERITY[a.level] - LEVEL_SEVERITY[b.level];
          break;
        case 'file':
          cmp = (fileMap.get(a.fileId) || '').localeCompare(fileMap.get(b.fileId) || '');
          break;
        case 'pidTid':
          cmp = a.pidTid.localeCompare(b.pidTid);
          break;
        case 'tag':
          cmp = a.tag.localeCompare(b.tag);
          break;
        case 'message':
          cmp = a.message.localeCompare(b.message);
          break;
      }
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });

    return allEntries;
  }, [files, filters, sortConfig]);

  const handleExportLogs = useCallback(() => {
    if (filteredEntries.length === 0) return;
    const content = filteredEntries.map(e => e.raw).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logvision_export_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  const handleCopyAIPrompt = useCallback((anonymize: boolean, customStrings: string[]) => {
    if (filteredEntries.length === 0) return;
    let content = filteredEntries.map(e => e.raw).join('\n');
    
    if (anonymize) {
      // IPv4 and IPv6
      content = content.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b|(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi, '[IP]');
      // Emails
      content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
      // UUIDs
      content = content.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '[UUID]');
      // Hashes (SHA-256 etc, 32+ hex chars)
      content = content.replace(/\b[0-9a-fA-F]{32,}\b/g, '[HASH]');
      // JWT Tokens
      content = content.replace(/eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT]');
      // Generic Bearer/API Keys
      content = content.replace(/(?:api_key|apikey|bearer|token)[\s=:]+["']?[a-zA-Z0-9_\-]+["']?/gi, '[SECRET]');
      // MAC Addresses
      content = content.replace(/\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\b/g, '[MAC]');
    }

    if (customStrings.length > 0) {
      customStrings.forEach(str => {
        if (!str.trim()) return;
        // Escape regex special characters to safely use in regex
        const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        content = content.replace(regex, '[REDACTED]');
      });
    }

    const prompt = `Please analyze the following application logs and identify any issues, errors, or anomalies. Provide a summary of the root cause and potential fixes.\n\nLogs:\n\`\`\`\n${content}\n\`\`\``;
    navigator.clipboard.writeText(prompt);
  }, [filteredEntries]);

  return (
    <div 
      className="flex h-full w-full relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Sidebar 
        files={files}
        availableTokens={availableTokens}
        timeBounds={timeBounds}
        isSameDay={isSameDay}
        onToggleFile={toggleFileVisibility}
        onRemoveFile={removeFile}
        filters={filters}
        onUpdateFilters={setFilters}
        onFilesAdded={processFiles}
        onExportLogs={handleExportLogs}
        onCopyAIPrompt={handleCopyAIPrompt}
      />
      
      <main className="flex-1 flex flex-col bg-gray-950 relative min-w-0">
        {/* Header bar */}
        {files.length > 0 && (
          <header className="flex-none bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between z-10 shadow-sm">
            <h2 className="text-sm font-medium text-gray-300">
              Showing <span className="text-white font-bold">{filteredEntries.length}</span> entries
            </h2>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Files: {files.filter(f => f.visible).length}/{files.length} visible</span>
            </div>
          </header>
        )}

        {/* Content Area */}
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 m-8 rounded-2xl bg-gray-900/20">
            <div className="bg-gray-800 p-4 rounded-full mb-4 text-blue-400">
              <UploadIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Drag & Drop logs here</h2>
            <p className="text-gray-500 mb-8 max-w-md text-center">
              Drop one or multiple standard log files here to visualize, combine, and filter them instantly.
            </p>
          </div>
        ) : (
          <LogViewer 
            entries={filteredEntries} 
            files={files} 
            sortConfig={sortConfig}
            onSort={handleSort}
            isSameDay={isSameDay}
          />
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col items-center border border-gray-700">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white font-medium">Processing Logs...</p>
            </div>
          </div>
        )}
      </main>

      {/* Drag Overlay */}
      {isDragging && !isLoading && (
        <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-blue-500 border-dashed rounded-lg m-4 pointer-events-none">
          <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center border border-blue-500/50">
            <UploadIcon className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-white">Drop files to add</h2>
          </div>
        </div>
      )}
    </div>
  );
}
