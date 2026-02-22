
import React, { useState, useMemo } from 'react';
import type { ChatTurnLog, SummaryQueueItem, ChatMessage, PromptSection } from '../../../types';
import { CopyButton } from '../../ui/CopyButton';
import { getGlobalContextSettings } from '../../../services/settingsService';
import { PromptBlock } from './DebugCommons';

interface SummaryStats {
    messageCount: number;
    summaryCount: number;
    contextDepth: number;
    chunkSize: number;
    queueLength: number;
}

interface SummariesViewProps {
    turns: ChatTurnLog[];
    messages: ChatMessage[];
    stats?: SummaryStats;
    onForceSummarize?: () => void;
    longTermSummaries?: string[];
    summaryQueue?: SummaryQueueItem[];
    onRegenerate?: (index: number) => Promise<void>;
    onRetry?: () => Promise<void>;
}

export const SummariesView: React.FC<SummariesViewProps> = ({ 
    turns, 
    messages,
    stats, 
    onForceSummarize, 
    longTermSummaries = [], 
    summaryQueue = [], 
    onRegenerate, 
    onRetry 
}) => {
    
    const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());
    const [isRetrying, setIsRetrying] = useState(false);
    
    const summaryCount = stats?.summaryCount || 0;
    const totalMessages = stats?.messageCount || 0;
    const contextDepth = stats?.contextDepth || 20;
    const queueLength = stats?.queueLength || 0;
    const unsummarizedCount = totalMessages;
    
    const progressPercent = Math.min(100, Math.floor((unsummarizedCount / contextDepth) * 100));
    const canForce = unsummarizedCount >= contextDepth;
    const isBusy = queueLength > 0;
    const currentTask = summaryQueue.length > 0 ? summaryQueue[0] : null;
    const hasError = currentTask?.status === 'failed';

    // --- RECONSTRUCTION LOGIC ---
    // Reconstruct the exact prompt used to generate a specific summary index
    const reconstructPrompt = (index: number): PromptSection[] => {
        const settings = getGlobalContextSettings();
        const chunkSize = settings.summarization_chunk_size || 10;
        const template = settings.summarization_prompt || '';

        // 1. Context (Rolling Window of 5 previous summaries)
        const prevSummaries = longTermSummaries.slice(0, index).slice(-5);
        // Format for list view
        const prevSummariesList = prevSummaries.map((s, i) => `[Tóm tắt cũ #${i + 1}]: ${s.substring(0, 100)}...`);
        const contextContent = prevSummaries.length > 0 
            ? `Bao gồm ${prevSummaries.length} gói tóm tắt liền trước.` 
            : "(Chưa có bối cảnh trước đó)";

        // 2. Data Slice (Actual messages covered by this summary)
        // Count Model messages to find start/end indices in the full message array
        let startMsgIdx = 0;
        let endMsgIdx = messages.length;
        let turnCount = 0;
        const targetStartTurn = index * chunkSize;
        const targetEndTurn = (index + 1) * chunkSize;

        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'model') {
                turnCount++;
                // If this model message ends the previous block, the NEXT message starts this block
                if (turnCount === targetStartTurn) startMsgIdx = i + 1;
                // If this model message ends the current block, this is the end (exclusive for slice)
                if (turnCount === targetEndTurn) {
                    endMsgIdx = i + 1;
                    break;
                }
            }
        }
        if (index === 0) startMsgIdx = 0; // Ensure first block starts at 0

        const slice = messages.slice(startMsgIdx, endMsgIdx);
        // Format for list view (distinct items)
        const sliceList = slice.map(m => {
            const role = m.role === 'user' ? 'User' : (m.role === 'model' ? 'Char' : 'System');
            // Clean content for display
            const cleanContent = m.content.replace(/<[^>]*>/g, '').trim(); 
            return `[${role}] ${cleanContent}`;
        });

        const sliceContent = sliceList.length > 0 
            ? `Bao gồm ${sliceList.length} tin nhắn (từ lượt ${targetStartTurn + 1} đến ${turnCount}).`
            : "(Không tìm thấy dữ liệu tương ứng trong lịch sử hiện tại)";

        // 3. Return as structured sections for PromptBlock
        return [
            { 
                id: 'sys', 
                name: '⚙️ System Instruction (Template)', 
                content: template, 
                role: 'system' 
            },
            { 
                id: 'ctx', 
                name: '📚 Previous Context (Rolling Window)', 
                content: contextContent, 
                role: 'system',
                subSections: prevSummaries.length > 0 ? prevSummaries : undefined // Pass array for distinct blocks
            },
            { 
                id: 'dat', 
                name: '💬 Target Data (Chat Slice)', 
                content: sliceContent, 
                role: 'user',
                subSections: sliceList.length > 0 ? sliceList : undefined // Pass array for distinct blocks
            }
        ];
    };

    const handleRegenerateClick = async (index: number) => {
        if (!onRegenerate || regeneratingIndices.has(index)) return;
        setRegeneratingIndices(prev => new Set(prev).add(index));
        try {
            await onRegenerate(index);
        } catch (e) {
            console.error("Regenerate failed", e);
            alert(`Lỗi khi tạo lại tóm tắt: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRegeneratingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleRetryClick = async () => {
        if (!onRetry || isRetrying) return;
        setIsRetrying(true);
        try {
            await onRetry();
        } catch (e) {
            console.error("Retry failed", e);
        } finally {
            setIsRetrying(false);
        }
    }

    return (
        <div className="space-y-4">
            {stats && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Số lượng Tóm tắt</p>
                            <p className="text-lg font-mono text-sky-400 font-bold">{summaryCount} <span className="text-xs text-slate-500 font-normal">gói</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Lượt Mới (Trong Bộ Nhớ)</p>
                            <p className={`text-lg font-mono font-bold ${canForce ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                                ~{unsummarizedCount} <span className="text-xs text-slate-500 font-normal">/ {contextDepth} lượt</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-full bg-slate-900 rounded-full h-2 mb-3 overflow-hidden border border-slate-700/50">
                        <div 
                            className={`h-full transition-all duration-500 ${hasError ? 'bg-red-600' : (canForce ? 'bg-amber-500' : 'bg-sky-600')}`} 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                        <div className="text-[10px] text-slate-500 flex-grow">
                            {hasError ? (
                                <span className="text-red-400 font-bold flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    Lỗi tóm tắt!
                                </span>
                            ) : queueLength > 0 ? (
                                `Đang xử lý ${queueLength} tác vụ...`
                            ) : (canForce ? "Hệ thống nên tự động tóm tắt ngay." : "Chưa đủ dữ liệu.")}
                        </div>
                        
                        {hasError && onRetry && (
                            <button
                                onClick={handleRetryClick}
                                disabled={isRetrying}
                                className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 flex items-center gap-2 animate-bounce"
                            >
                                {isRetrying ? 'Đang thử...' : 'Thử lại (Retry)'}
                            </button>
                        )}

                        {!hasError && onForceSummarize && (
                            <button
                                onClick={onForceSummarize}
                                disabled={!canForce || isBusy}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    isBusy 
                                        ? 'bg-slate-700 text-slate-500 cursor-wait'
                                        : canForce 
                                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20' 
                                            : 'bg-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                                }`}
                            >
                                {isBusy ? 'Đang chạy...' : 'Buộc Tóm Tắt'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {longTermSummaries.length === 0 ? (
                <div className="p-8 text-center text-slate-600 italic text-xs bg-slate-900/30 rounded-lg border border-slate-800">Chưa có tóm tắt nào được tạo (Dữ liệu trống).</div>
            ) : (
                <div className="flex flex-col gap-2">
                    {longTermSummaries.map((summaryContent, index) => {
                        const reconstructedParts = reconstructPrompt(index);
                        
                        return (
                            <details key={index} className="group bg-slate-900/30 border border-slate-700/50 rounded-lg">
                                <summary className="px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none list-none flex items-center justify-between rounded-lg outline-none focus:ring-2 focus:ring-sky-500/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-amber-400">Tóm tắt #{index + 1}</span>
                                        <span className="text-[10px] text-slate-500 italic">(Dữ liệu Bền vững)</span>
                                    </div>
                                    <span className="transform group-open:rotate-90 transition-transform text-slate-500 text-[10px]" aria-hidden="true">▶</span>
                                </summary>
                                <div className="p-3 border-t border-slate-700/50 relative">
                                    
                                    {/* NEW: Reconstructed Prompt View */}
                                    <details className="mb-4 group/prompt border-l-2 border-indigo-500/30 pl-2">
                                        <summary className="cursor-pointer text-[10px] text-indigo-400 hover:text-indigo-300 font-bold mb-2 flex items-center gap-2">
                                            <span>📤 Lời nhắc Tóm tắt (Reconstructed)</span>
                                            <span className="transform group-open/prompt:rotate-90 transition-transform text-[8px]" aria-hidden="true">▶</span>
                                        </summary>
                                        <div className="space-y-2 mt-2">
                                            {reconstructedParts.map((part) => (
                                                <PromptBlock key={part.id} section={part} />
                                            ))}
                                        </div>
                                    </details>

                                    <div className="absolute top-3 right-3 z-10 flex gap-1">
                                        <CopyButton textToCopy={summaryContent || ''} absolute={true} />
                                    </div>
                                    
                                    <div className="text-[10px] text-green-400 font-bold mb-1">📥 Kết quả (Result)</div>
                                    <div className="bg-amber-900/10 border border-amber-900/30 p-3 rounded mb-2">
                                        <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{summaryContent}</p>
                                    </div>
                                    
                                    {onRegenerate && (
                                        <div className="flex justify-end pt-2 border-t border-slate-700/30">
                                            <button
                                                onClick={() => handleRegenerateClick(index)}
                                                disabled={regeneratingIndices.has(index)}
                                                className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-sky-700 text-slate-400 hover:text-white transition-colors border border-slate-600 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {regeneratingIndices.has(index) ? 'Đang tạo lại...' : 'Thử lại (Regenerate)'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
