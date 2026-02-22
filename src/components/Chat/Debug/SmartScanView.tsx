
import React, { useState, useMemo, memo } from 'react';
import { CopyButton } from '../../ui/CopyButton';
import { LogPaginationControls } from './DebugCommons';

const SmartScanItem = memo(({ logString, index, total }: { logString: string, index: number, total: number }) => {
    const parsedLog = useMemo(() => {
        try {
            return JSON.parse(logString);
        } catch (e) {
            return { fullPrompt: logString, rawResponse: 'Error parsing log', latency: 0 };
        }
    }, [logString]);

    return (
        <div className="bg-slate-900/30 border border-fuchsia-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2 border-b border-fuchsia-500/20 pb-2">
                <span className="text-xs font-bold text-fuchsia-400">Scan #{total - index} <span className="text-slate-500 font-normal">({parsedLog.latency}ms)</span></span>
            </div>
            
            <details className="mb-2 group">
                <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-sky-400 font-bold mb-1 flex items-center gap-2">
                    <span>📤 Lời nhắc Gửi đi (Outgoing Prompt)</span>
                    <span className="transform group-open:rotate-90 transition-transform text-[8px]" aria-hidden="true">▶</span>
                </summary>
                <div className="relative mt-1">
                    <div className="absolute top-1 right-1 z-10">
                        <CopyButton textToCopy={parsedLog.fullPrompt} absolute={false} />
                    </div>
                    <pre className="text-[9px] text-slate-300 font-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded border border-slate-700/50 max-h-40 overflow-y-auto custom-scrollbar">
                        {parsedLog.fullPrompt}
                    </pre>
                </div>
            </details>

            <div className="relative">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-green-400 font-bold">📥 Phản hồi Thô (AI Response)</span>
                    <CopyButton textToCopy={parsedLog.rawResponse} label="Copy JSON" absolute={false} />
                </div>
                <pre className="text-[10px] text-indigo-200 font-mono whitespace-pre-wrap break-words bg-black/20 p-2 rounded border border-indigo-500/20">
                    {parsedLog.rawResponse}
                </pre>
            </div>
        </div>
    );
});

export const SmartScanLogView: React.FC<{ logs: string[] }> = ({ logs }) => {
    const [visibleCount, setVisibleCount] = useState(3);
    const displayedLogs = logs.slice(0, visibleCount);

    return (
        <div className="space-y-4">
            {displayedLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có dữ liệu Smart Scan.</div>
            ) : (
                <>
                    {displayedLogs.map((logString, idx) => (
                        <SmartScanItem key={idx} logString={logString} index={idx} total={logs.length} />
                    ))}
                    <LogPaginationControls 
                        visibleCount={visibleCount} 
                        totalCount={logs.length} 
                        onLoadMore={() => setVisibleCount(p => p + 3)} 
                        step={3}
                    />
                </>
            )}
        </div>
    );
};
