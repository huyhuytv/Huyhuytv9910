
import React, { useState, useMemo } from 'react';
import type { SystemLogEntry } from '../../../types';
import { LogPaginationControls, formatTimestamp } from './DebugCommons';

interface ConsoleViewProps {
    logs: SystemLogEntry[];
    onInspectState: () => void;
    onClearLogs: () => void;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({ logs, onInspectState, onClearLogs }) => {
    const [logFilter, setLogFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);

    const LOG_FILTERS = [
        { id: 'all', label: 'Tất cả' },
        { id: 'errors', label: 'Lỗi' },
        { id: 'warn', label: 'Cảnh báo' },
        { id: 'console', label: 'Browser Console' },
        { id: 'network', label: 'Mạng' },
        { id: 'iframe', label: 'Iframe' },
        { id: 'regex', label: 'Regex' },
        { id: 'variable', label: 'Biến số' },
        { id: 'state', label: 'Trạng thái' },
    ];

    const getLogLevelClass = (log: SystemLogEntry) => {
        const { level, source } = log;
        if (source === 'console' && level === 'error') return 'text-orange-400 bg-orange-900/10 border-orange-900/30';
        if (source === 'network') return 'text-pink-400 bg-pink-900/10 border-pink-900/30';
        switch (level) {
            case 'error': case 'script-error': case 'api-error': return 'text-red-400 bg-red-900/10 border-red-900/30';
            case 'warn': return 'text-amber-400 bg-amber-900/10 border-amber-900/30';
            case 'script-success': return 'text-green-400';
            case 'interaction': return 'text-sky-400';
            case 'api': return 'text-violet-400';
            case 'state': return 'text-teal-400';
            case 'log': default: return 'text-slate-300';
        }
    };

    const filteredSystemLogs = useMemo(() => {
        let results = logs;
        if (logFilter === 'errors') results = results.filter(l => l.level.includes('error'));
        else if (logFilter === 'warn') results = results.filter(l => l.level === 'warn');
        else if (logFilter === 'iframe') results = results.filter(l => l.source === 'iframe');
        else if (logFilter === 'regex') results = results.filter(l => l.source === 'regex');
        else if (logFilter === 'variable') results = results.filter(l => l.source === 'variable');
        else if (logFilter === 'state') results = results.filter(l => l.level === 'state');
        else if (logFilter === 'console') results = results.filter(l => l.source === 'console');
        else if (logFilter === 'network') results = results.filter(l => l.source === 'network');
        
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            results = results.filter(l => l.message.toLowerCase().includes(lowerTerm));
        }
        return results;
    }, [logs, logFilter, searchTerm]);

    const handleCopyFiltered = () => {
        const text = filteredSystemLogs.map(l => `[${formatTimestamp(l.timestamp)}] [${l.source.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    const displayedLogs = filteredSystemLogs.slice(0, visibleCount);

    return (
        <div className="space-y-4 text-xs">
             <div className="flex flex-col gap-2">
                <div className="flex gap-1 flex-wrap">
                    {LOG_FILTERS.map(f => (
                        <button key={f.id} onClick={() => { setLogFilter(f.id); setVisibleCount(50); }} className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded ${logFilter === f.id ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{f.label}</button>
                    ))}
                </div>
                <div className="flex items-center justify-between gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                    <input type="text" placeholder="Tìm kiếm log..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] flex-grow min-w-[100px]" />
                    <div className="flex items-center gap-1">
                        <button onClick={onInspectState} className="px-2 py-1 bg-teal-600/20 text-teal-400 border border-teal-600/30 rounded hover:bg-teal-600/40" title="Kiểm tra trạng thái biến">🔍 State</button>
                        <button onClick={handleCopyFiltered} className="px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 border border-slate-600" title="Sao chép log đang hiển thị">📋 Copy</button>
                        <button onClick={onClearLogs} className="px-2 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/40" title="Xóa toàn bộ log">🗑️ Clear</button>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/30 rounded-md font-mono text-[10px] border border-slate-700 max-h-[300px] overflow-y-auto custom-scrollbar">
                {displayedLogs.length === 0 ? (
                    <div className="p-4 text-center text-slate-600 italic">Không có log hệ thống nào khớp với bộ lọc.</div>
                ) : (
                    <>
                        {displayedLogs.map((log, idx) => (
                            <div key={idx} className={`p-1.5 border-b border-slate-800/50 flex gap-2 ${getLogLevelClass(log)}`}>
                                <span className="opacity-50 flex-shrink-0">{formatTimestamp(log.timestamp)}</span>
                                <span className="font-bold uppercase opacity-70 w-14 flex-shrink-0 truncate text-center border border-white/10 rounded bg-black/20 text-[9px] px-1">
                                    {log.source}
                                </span>
                                <span className="break-words flex-grow">{log.message}</span>
                            </div>
                        ))}
                        <LogPaginationControls 
                            visibleCount={visibleCount} 
                            totalCount={filteredSystemLogs.length} 
                            onLoadMore={() => setVisibleCount(p => p + 50)} 
                            step={50}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
