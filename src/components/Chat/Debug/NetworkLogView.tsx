
import React, { useState, useMemo, memo } from 'react';
import type { NetworkLogEntry } from '../../../types';
import { CopyButton } from '../../ui/CopyButton';
import { LogPaginationControls } from './DebugCommons';

const maskApiKey = (cmd: string): string => {
    return cmd.replace(/(Authorization: Bearer\s+)([A-Za-z0-9\-\._]+)/gi, (match, prefix, token) => {
        if (token.length > 8) {
            return `${prefix}${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
        }
        return `${prefix}****`;
    }).replace(/key=([^&\s]+)/gi, (match, key) => { 
         if (key.length > 8) {
            return `key=${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
        }
        return `key=****`;
    });
};

const generateCurlCommand = (entry: NetworkLogEntry): string => {
    let cmd = `curl -X ${entry.method} "${entry.url}" \\\n`;
    
    if (entry.headers) {
        Object.entries(entry.headers).forEach(([key, value]) => {
            cmd += `  -H "${key}: ${value}" \\\n`;
        });
    }
    
    if (entry.body) {
        let bodyStr = "";
        if (typeof entry.body === 'string') {
            bodyStr = entry.body;
        } else {
            try {
                bodyStr = JSON.stringify(entry.body, null, 2);
            } catch {
                bodyStr = String(entry.body);
            }
        }
        const escapedBody = bodyStr.replace(/'/g, "'\\''");
        cmd += `  -d '${escapedBody}'`;
    } else {
        cmd = cmd.slice(0, -3); 
    }
    
    return maskApiKey(cmd);
};

const NetworkLogAccordionItem = memo(({ log }: { log: NetworkLogEntry }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dateStr = new Date(log.timestamp).toLocaleTimeString();
    
    const curlCmd = useMemo(() => {
        if (!isOpen) return ''; 
        return generateCurlCommand(log);
    }, [log, isOpen]);

    const getSourceColor = (source: string) => {
        switch (source) {
            case 'gemini': return 'bg-teal-900/40 text-teal-400 border-teal-800';
            case 'openrouter': return 'bg-purple-900/40 text-purple-400 border-purple-800';
            case 'proxy': return 'bg-cyan-900/40 text-cyan-400 border-cyan-800';
            default: return 'bg-slate-700 text-slate-400 border-slate-600';
        }
    };
    
    const getMethodColor = (method: string) => {
        if (method === 'POST') return 'text-blue-400 font-bold';
        if (method === 'GET') return 'text-yellow-400 font-bold';
        return 'text-slate-400';
    };

    return (
        <div className="mb-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30 transition-all duration-200">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-800/50 transition-colors text-left group"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${getSourceColor(log.source)}`}>
                        {log.source}
                    </span>
                    <span className={`text-[10px] w-8 ${getMethodColor(log.method)}`}>{log.method}</span>
                    <span className="text-[10px] text-slate-400 truncate font-mono opacity-80" title={log.url}>
                        {log.url.length > 50 ? '...' + log.url.slice(-50) : log.url}
                    </span>
                </div>

                <div className="flex items-center gap-3 pl-2">
                    <span className="text-[9px] text-slate-600 font-mono whitespace-nowrap">{dateStr}</span>
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-3 w-3 text-slate-500 transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="border-t border-slate-800 bg-slate-950/50 p-3 animate-fade-in-up">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">CURL Command</span>
                        <CopyButton textToCopy={curlCmd} label="Copy CURL" absolute={false} />
                    </div>
                    <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap break-all bg-black/20 p-2 rounded border border-slate-800">
                        {curlCmd}
                    </pre>
                </div>
            )}
        </div>
    );
});

export const NetworkLogView: React.FC<{ logs: NetworkLogEntry[] | undefined }> = ({ logs }) => {
    const [visibleCount, setVisibleCount] = useState(3);
    
    if (!logs || logs.length === 0) {
        return (
             <div className="p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có nhật ký mạng nào.</div>
        );
    }
    
    const displayedLogs = logs.slice(0, visibleCount);

    return (
        <div className="space-y-1">
             {displayedLogs.map((log, idx) => (
                 <NetworkLogAccordionItem key={log.id || idx} log={log} />
             ))}
             
             <LogPaginationControls 
                visibleCount={visibleCount} 
                totalCount={logs.length} 
                onLoadMore={() => setVisibleCount(p => p + 3)} 
                step={3}
            />
        </div>
    );
};
