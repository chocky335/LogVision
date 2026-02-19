import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LogEntry, LogFile, ColumnConfig, ColumnId, SortConfig, LogLevel } from '../types';
import { LEVEL_COLORS, ALL_LEVELS, LEVEL_LABELS, LEVEL_ROW_BG, LEVEL_HIGHLIGHT_BG, LEVEL_HIGHLIGHT_RING } from '../constants';
import { 
  ColumnsIcon, ArrowUpIcon, ArrowDownIcon, FileIcon, 
  ClockIcon, ActivityIcon, TagIcon, ChevronUpIcon, ChevronDownIcon, CopyIcon 
} from './Icons';

interface LogViewerProps {
  entries: LogEntry[];
  files: LogFile[];
  sortConfig: SortConfig;
  onSort: (column: ColumnId) => void;
  isSameDay: boolean;
}

const PAGE_SIZE = 100;

// Specific min widths for resizing to ensure compact view works without glitching
const MIN_WIDTHS: Record<ColumnId, number> = {
  file: 40,
  time: 90,
  level: 40,
  pidTid: 60,
  tag: 40,
  message: 100,
};

const MAX_WIDTHS: Record<ColumnId, number> = {
  file: 250,
  time: 165, // Will be dynamically adjusted for time
  level: 100,
  pidTid: 150,
  tag: 300,
  message: 9999, // Allow message to grow infinitely
};

export const LogViewer: React.FC<LogViewerProps> = ({ entries, files, sortConfig, onSort, isSameDay }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'file', label: 'File', visible: true, width: 140 },
    { id: 'time', label: 'Time', visible: true, width: isSameDay ? 120 : 165 },
    { id: 'level', label: 'Level', visible: true, width: 85 },
    { id: 'pidTid', label: 'PID/TID', visible: true, width: 110 },
    { id: 'tag', label: 'Tag', visible: true, width: 180 },
    { id: 'message', label: 'Message', visible: true, width: 0 },
  ]);

  const [showColMenu, setShowColMenu] = useState(false);
  const [resizing, setResizing] = useState<{ id: ColumnId, startX: number, startW: number } | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Level Navigation State
  const [navLevel, setNavLevel] = useState<LogLevel | ''>('');
  const [navIndex, setNavIndex] = useState(0);
  const [navHighlightId, setNavHighlightId] = useState<string | null>(null);

  const navMatches = useMemo(() => {
    if (!navLevel) return [];
    return entries.map((e, i) => e.level === navLevel ? i : -1).filter(i => i !== -1);
  }, [entries, navLevel]);

  // Adjust time column width dynamically based on bounds if `isSameDay` changes
  useEffect(() => {
    setColumns(cols => cols.map(c => {
      if (c.id === 'time') {
        const maxTimeW = isSameDay ? 120 : 165;
        if (c.width > maxTimeW) return { ...c, width: maxTimeW };
      }
      return c;
    }));
  }, [isSameDay]);

  useEffect(() => {
    if (navMatches.length > 0) {
      setNavIndex(0);
      scrollToMatch(0);
    } else {
      setNavHighlightId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navLevel, navMatches.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  const scrollToMatch = (matchIdx: number) => {
    if (navMatches.length === 0 || matchIdx < 0 || matchIdx >= navMatches.length) return;
    
    const targetGlobalIndex = navMatches[matchIdx];
    const targetEntry = entries[targetGlobalIndex];
    setNavHighlightId(targetEntry.id);

    if (targetGlobalIndex >= visibleCount) {
      setVisibleCount(targetGlobalIndex + PAGE_SIZE);
    }

    setTimeout(() => {
      const el = document.getElementById(`log-${targetEntry.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleNavPrev = () => {
    const nextIdx = Math.max(navIndex - 1, 0);
    setNavIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  const handleNavNext = () => {
    const nextIdx = Math.min(navIndex + 1, navMatches.length - 1);
    setNavIndex(nextIdx);
    scrollToMatch(nextIdx);
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const diff = e.clientX - resizing.startX;
      const minW = MIN_WIDTHS[resizing.id] || 50;
      let maxW = MAX_WIDTHS[resizing.id] || 9999;
      
      // Strict constraint for time column
      if (resizing.id === 'time') {
        maxW = isSameDay ? 120 : 165;
      }

      const newWidth = Math.min(maxW, Math.max(minW, resizing.startW + diff));
      setColumns(cols => cols.map(c => c.id === resizing.id ? { ...c, width: newWidth } : c));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, isSameDay]);

  const handleResizeStart = (e: React.MouseEvent, col: ColumnConfig) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing({ id: col.id, startX: e.clientX, startW: col.width });
  };

  const toggleColumn = (id: ColumnId) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    if (scrollTop + clientHeight >= scrollHeight - 800) {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, entries.length));
    }
  };

  const fileMap = useMemo(() => {
    const map = new Map<string, LogFile>();
    files.forEach(f => map.set(f.id, f));
    return map;
  }, [files]);

  const visibleEntries = entries.slice(0, visibleCount);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No logs match the current filters.</p>
      </div>
    );
  }

  const renderHeaderLabel = (col: ColumnConfig) => {
    const isCompact = col.width > 0 && col.width <= MIN_WIDTHS[col.id] + 15;
    
    if (isCompact) {
      switch (col.id) {
        case 'file': return <FileIcon className="w-4 h-4 mx-auto text-gray-400" />;
        case 'time': return <ClockIcon className="w-4 h-4 mx-auto text-gray-400" />;
        case 'level': return <ActivityIcon className="w-4 h-4 mx-auto text-gray-400" />;
        case 'pidTid': return <span className="mx-auto text-[10px]">P/T</span>;
        case 'tag': return <TagIcon className="w-4 h-4 mx-auto text-gray-400" />;
      }
    }
    return <span className="truncate">{col.label}</span>;
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-950 font-mono text-[13px] leading-relaxed relative"
      style={{ userSelect: resizing ? 'none' : 'auto' }}
    >
      <div className="w-full flex flex-col relative" style={{ minHeight: '100%' }}>
        
        {/* Sticky Table Header */}
        <div className="sticky top-0 z-20 flex bg-gray-900 border-b border-gray-800 text-gray-400 text-xs font-semibold uppercase shadow-sm">
          <div className="w-[4px] shrink-0 bg-transparent border-r border-gray-800/50" />
          
          {columns.map(col => {
            if (!col.visible) return null;
            const isSorted = sortConfig.column === col.id;
            
            return (
              <div
                key={col.id}
                className="flex items-center px-3 py-2 border-r border-gray-800 relative group select-none cursor-pointer hover:bg-gray-800 transition-colors"
                style={{ width: col.width || undefined, flex: col.width === 0 ? 1 : 'none' }}
                onClick={() => onSort(col.id)}
              >
                <div className="flex-1 flex items-center gap-1 overflow-hidden">
                  {renderHeaderLabel(col)}
                  
                  {isSorted && (
                    <span className="text-blue-400 shrink-0">
                      {sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                    </span>
                  )}
                </div>

                {col.width > 0 && (
                  <div
                    className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 transition-colors ${
                      resizing?.id === col.id ? 'bg-blue-500' : 'hover:bg-blue-500/50'
                    }`}
                    onMouseDown={(e) => handleResizeStart(e, col)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )
          })}
          
          {/* Action Column Header */}
          <div className="w-12 shrink-0 border-l border-gray-800 flex items-center justify-center relative">
            <button 
              onClick={() => setShowColMenu(v => !v)} 
              className={`p-1.5 rounded transition-colors ${showColMenu ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Configure Columns"
            >
              <ColumnsIcon className="w-4 h-4" />
            </button>
            
            {showColMenu && (
              <div className="absolute right-2 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-2 text-sm normal-case font-normal text-gray-200 font-sans">
                <div className="mb-2 px-1 pb-1 border-b border-gray-700 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  Show/Hide Columns
                </div>
                <div className="space-y-1">
                  {columns.map(c => (
                    <label key={c.id} className="flex items-center space-x-2 p-1.5 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={c.visible} 
                        onChange={() => toggleColumn(c.id)} 
                        disabled={c.id === 'message'}
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-900"
                      />
                      <span className={c.id === 'message' ? 'text-gray-500' : ''}>{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 flex flex-col relative z-0">
          {visibleEntries.map((entry) => {
            const file = fileMap.get(entry.fileId);
            const isHighlighted = entry.id === navHighlightId;
            const isRowExpanded = expandedRows.has(entry.id);
            const rowBgClass = LEVEL_ROW_BG[entry.level] || 'hover:bg-gray-800/50';

            const highlightClasses = isHighlighted 
              ? `${LEVEL_HIGHLIGHT_BG[entry.level]} ring-1 ${LEVEL_HIGHLIGHT_RING[entry.level]} z-10 relative shadow-lg`
              : rowBgClass;

            return (
              <div 
                id={`log-${entry.id}`}
                key={entry.id} 
                className={`flex border-b border-gray-800/30 group transition-colors ${highlightClasses}`}
              >
                <div className={`w-[4px] shrink-0 border-r border-gray-800/50 ${file?.color || 'bg-gray-500'} shadow-[inset_-1px_0_2px_rgba(0,0,0,0.2)]`} title={file?.name} />
                
                {columns.map(col => {
                  if (!col.visible) return null;
                  
                  let extraClasses = "px-3 py-1.5 flex-none overflow-hidden text-ellipsis ";
                  let content: React.ReactNode = null;

                  if (col.id === 'file') {
                    if (col.width <= MIN_WIDTHS.file + 15) {
                      content = (
                        <div title={file?.name}>
                          <FileIcon className="w-4 h-4 mx-auto text-gray-500 mt-0.5" />
                        </div>
                      );
                    } else {
                      content = (
                        <div className="truncate text-gray-400" title={file?.name}>
                          {file?.name}
                        </div>
                      );
                    }
                  } else if (col.id === 'time') {
                    const fullTimeStr = isSameDay ? entry.time : `${entry.date} ${entry.time}`;
                    if (col.width <= MIN_WIDTHS.time + 15) {
                      // Text clip without ellipsis for specific width matching
                      content = (
                        <div className="text-gray-500 overflow-hidden whitespace-nowrap" style={{ textOverflow: 'clip' }} title={fullTimeStr}>
                          {entry.time.split('.')[0]}
                        </div>
                      );
                    } else {
                      content = <div className="text-gray-500 truncate" title={fullTimeStr}>{fullTimeStr}</div>;
                    }
                  } else if (col.id === 'level') {
                    if (col.width <= MIN_WIDTHS.level + 15) {
                      content = (
                        <div className="text-center font-bold text-[12px]" title={LEVEL_LABELS[entry.level]}>
                          <span className={LEVEL_COLORS[entry.level].split(' ')[0]}>{entry.level}</span>
                        </div>
                      );
                    } else {
                      content = (
                        <div className="text-left" title={LEVEL_LABELS[entry.level]}>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${LEVEL_COLORS[entry.level]}`}>
                            {LEVEL_LABELS[entry.level]}
                          </span>
                        </div>
                      );
                    }
                  } else if (col.id === 'pidTid') {
                    content = <div className="text-gray-600 truncate" title={entry.pidTid}>{entry.pidTid}</div>;
                  } else if (col.id === 'tag') {
                    if (col.width <= MIN_WIDTHS.tag + 15) {
                      content = (
                        <div title={entry.tag}>
                          <TagIcon className="w-4 h-4 mx-auto text-gray-600" />
                        </div>
                      );
                    } else {
                      content = <div className="text-gray-400 truncate font-medium" title={entry.tag}>{entry.tag}</div>;
                    }
                  } else if (col.id === 'message') {
                    extraClasses = "px-3 py-1.5 flex-1 min-w-0 cursor-pointer hover:bg-gray-800/40 transition-colors overflow-hidden ";
                    content = (
                      <div 
                        onClick={() => toggleRow(entry.id)}
                        className={`text-gray-300 ${isRowExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}
                      >
                        {entry.message}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={col.id} 
                      className={extraClasses} 
                      style={col.width > 0 ? { width: col.width } : undefined}
                    >
                      {content}
                    </div>
                  );
                })}

                {/* Action Column Body */}
                <div className="w-12 shrink-0 border-l border-gray-800/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(entry.raw); }}
                    className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                    title="Copy Row"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {visibleCount < entries.length && (
            <div className="py-8 text-center text-gray-500 bg-gray-900/50 italic">
              Loading more entries...
            </div>
          )}
        </div>
      </div>

      {/* Level Navigation Bar */}
      <div className="fixed bottom-6 right-6 bg-gray-800/95 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-2 flex items-center gap-3 z-50 transition-opacity">
        <span className="text-xs text-gray-400 font-semibold px-2 uppercase tracking-wide">Focus Level:</span>
        <select 
          value={navLevel} 
          onChange={(e) => setNavLevel(e.target.value as LogLevel | '')}
          className="bg-gray-950 border border-gray-700 rounded-md text-sm text-gray-200 p-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Off</option>
          {ALL_LEVELS.map(level => (
            <option key={level} value={level}>{LEVEL_LABELS[level]} ({level})</option>
          ))}
        </select>
        
        {navLevel && (
          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-700">
            <span className="text-sm font-medium text-gray-300 w-16 text-center">
              {navMatches.length > 0 ? navIndex + 1 : 0} <span className="text-gray-500">/</span> {navMatches.length}
            </span>
            <div className="flex gap-1">
              <button 
                onClick={handleNavPrev} 
                disabled={navMatches.length === 0 || navIndex === 0}
                className="p-1.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors"
                title="Previous Match"
              >
                <ChevronUpIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNavNext} 
                disabled={navMatches.length === 0 || navIndex === navMatches.length - 1}
                className="p-1.5 bg-gray-900 hover:bg-gray-700 border border-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors"
                title="Next Match"
              >
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};