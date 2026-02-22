
import React, { useState } from 'react';
import { CopyButton } from '../../ui/CopyButton';
import { LogPaginationControls } from './DebugCommons';

export const WorldInfoLogView: React.FC<{ logs: string[] }> = ({ logs }) => {
    const [visibleCount, setVisibleCount] = useState(3);
    const displayedLogs = logs.slice(0, visibleCount);

    return (
        <div className="space-y-2">
            {displayedLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có mục World Info nào được kích hoạt.</div>
            ) : (
                <>
                    {displayedLogs.map((log, idx) => (
                        <div key={idx} className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-3">
                            <div className="flex justify-end mb-1">
                                <CopyButton textToCopy={log} label="Copy" absolute={false} />
                            </div>
                            <pre className="text-[10px] text-emerald-300 font-mono whitespace-pre-wrap break-words">{log}</pre>
                        </div>
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
