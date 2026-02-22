
import React, { useState } from 'react';
import type { ChatTurnLog } from '../../../types';
import { CopyButton } from '../../ui/CopyButton';
import { LengthIndicator, LogPaginationControls, PromptBlock } from './DebugCommons';

// --- AiCreatorView ---
export const AiCreatorView: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
    return (
        <div className="p-2">
            <button onClick={onOpen} className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg border border-indigo-400/30 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                <span className="text-lg" aria-hidden="true">✨</span>
                <span>Tạo Mục Sổ tay Mới với AI</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2">Sử dụng ngữ cảnh hội thoại hiện tại để tạo nội dung World Info tự động.</p>
        </div>
    );
};

// --- PromptsView ---
export const PromptsView: React.FC<{ turns: ChatTurnLog[] }> = ({ turns }) => {
    const [visibleCount, setVisibleCount] = useState(3);
    const totalTurns = turns.length;
    const displayedTurns = turns.slice(0, visibleCount);

    return (
        <div className="space-y-2">
            {displayedTurns.length === 0 ? (
                <div className="p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có dữ liệu lời nhắc.</div>
            ) : (
                <>
                    {displayedTurns.map((turn, index) => (
                        <details key={index} className="group bg-slate-900/30 border border-slate-700/50 rounded-lg">
                            <summary className="px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-violet-400">Lượt #{totalTurns - index}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(turn.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <LengthIndicator sections={turn.prompt} />
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">{turn.prompt.length} mục</span>
                                    <span className="transform group-open:rotate-90 transition-transform text-slate-500 text-[10px]" aria-hidden="true">▶</span>
                                </div>
                            </summary>
                            <div className="p-3 space-y-2 border-t border-slate-700/50">
                                <div className="flex justify-end mb-2">
                                    <CopyButton textToCopy={turn.prompt.map(p => p.content).join('\n\n')} label="Sao chép tất cả" absolute={false} />
                                </div>
                                {turn.prompt.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">Không có dữ liệu prompt.</p>
                                ) : (
                                    turn.prompt.map((section) => (
                                        <PromptBlock key={section.id} section={section} />
                                    ))
                                )}
                            </div>
                        </details>
                    ))}
                    <LogPaginationControls 
                        visibleCount={visibleCount} 
                        totalCount={totalTurns} 
                        onLoadMore={() => setVisibleCount(p => p + 3)} 
                        step={3}
                    />
                </>
            )}
        </div>
    );
};

// --- ResponsesView ---
export const ResponsesView: React.FC<{ turns: ChatTurnLog[] }> = ({ turns }) => {
    const [visibleCount, setVisibleCount] = useState(3);
    const totalTurns = turns.length;
    const displayedTurns = turns.slice(0, visibleCount);

    return (
        <div className="space-y-2">
            {displayedTurns.length === 0 ? (
                <div className="p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có dữ liệu phản hồi.</div>
            ) : (
                <>
                    {displayedTurns.map((turn, index) => (
                        <details key={index} className="group bg-slate-900/30 border border-slate-700/50 rounded-lg">
                            <summary className="px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-emerald-400">Lượt #{totalTurns - index}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(turn.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <span className="transform group-open:rotate-90 transition-transform text-slate-500 text-[10px]" aria-hidden="true">▶</span>
                            </summary>
                            <div className="p-3 border-t border-slate-700/50 relative">
                                <div className="absolute top-3 right-3 z-10">
                                    <CopyButton textToCopy={turn.response} absolute={true} />
                                </div>
                                <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-pre-wrap break-words">
                                    {turn.response || '(Chưa có phản hồi)'}
                                </pre>
                            </div>
                        </details>
                    ))}
                    <LogPaginationControls 
                        visibleCount={visibleCount} 
                        totalCount={totalTurns} 
                        onLoadMore={() => setVisibleCount(p => p + 3)} 
                        step={3}
                    />
                </>
            )}
        </div>
    );
};
