
import React, { useMemo, useState } from 'react';
import { PromptSection } from '../../../types';
import { CopyButton } from '../../ui/CopyButton';

// --- HELPER: Time ---
export const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

// --- HELPER: Pagination Controls ---
export const LogPaginationControls: React.FC<{
    visibleCount: number;
    totalCount: number;
    onLoadMore: () => void;
    step?: number;
}> = ({ visibleCount, totalCount, onLoadMore, step = 10 }) => {
    if (visibleCount >= totalCount) return null;
    const remaining = totalCount - visibleCount;
    return (
        <div className="flex justify-center mt-2 mb-4">
            <button
                onClick={(e) => { e.stopPropagation(); onLoadMore(); }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-full px-4 py-1 transition-colors"
            >
                Tải thêm {Math.min(remaining, step)} dòng cũ hơn... (Còn {remaining})
            </button>
        </div>
    );
};

// --- COMPONENT: Length & Token Estimator ---
export const LengthIndicator: React.FC<{ sections: PromptSection[] }> = ({ sections }) => {
    const [showStats, setShowStats] = useState(false);

    const stats = useMemo(() => {
        const totalChars = sections.reduce((acc, sec) => acc + (sec.content || '').length, 0);
        const estTokens = Math.ceil(totalChars / 3.5);
        return { 
            chars: totalChars.toLocaleString('vi-VN'), 
            tokens: estTokens.toLocaleString('vi-VN') 
        };
    }, [sections]);

    if (showStats) {
        return (
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStats(false); }}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-2 py-0.5 rounded shadow-sm transition-all animate-fade-in-up flex items-center gap-1 font-mono"
                title="Nhấn để thu gọn"
            >
                <span>📝 {stats.chars} ký tự</span>
                <span className="opacity-60">|</span>
                <span className="text-indigo-200">~{stats.tokens} tokens</span>
            </button>
        );
    }

    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStats(true); }}
            className="text-[10px] bg-slate-800 text-slate-400 border border-slate-600 px-2 py-0.5 rounded hover:text-sky-400 hover:border-sky-500 hover:bg-slate-700 transition-colors flex items-center gap-1"
            title="Kiểm tra độ dài và ước lượng token"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0 1 1 0 002 0zm2-4a1 1 0 110-2 1 1 0 010 2zm1 4a1 1 0 10-2 0 1 1 0 002 0zm2 0a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
            </svg>
            <span>Đếm độ dài</span>
        </button>
    );
};

// --- COMPONENT: PromptBlock ---
export const PromptBlock: React.FC<{ section: PromptSection }> = ({ section }) => {
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const lines = useMemo(() => section.content.split('\n'), [section.content]);

    const isListMode = useMemo(() => {
        const keywords = ['Replacement', 'Stop Strings'];
        return keywords.some(k => section.name.toLowerCase().includes(k.toLowerCase()));
    }, [section.name]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = target.nextElementSibling as HTMLElement;
            if (next && next.tabIndex >= 0) next.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = target.previousElementSibling as HTMLElement;
            if (prev && prev.tabIndex >= 0) prev.focus();
        }
    };

    return (
        <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden mb-2 shadow-sm">
            <div className="bg-slate-800/50 px-3 py-2 flex justify-between items-center border-b border-slate-700/50 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    <h4 className="text-xs font-bold text-violet-300 truncate" title={section.name}>
                        {section.name} 
                        {hasSubSections && <span className="ml-2 text-[9px] text-emerald-400 font-normal border border-emerald-800 px-1 rounded bg-emerald-900/30">Expanded View ({section.subSections?.length})</span>}
                        {!hasSubSections && isListMode && <span className="ml-2 text-[9px] text-slate-500 font-normal border border-slate-700 px-1 rounded bg-slate-900">List Mode</span>}
                    </h4>
                </div>
                <CopyButton textToCopy={section.content} absolute={false} />
            </div>
            
            <div className="p-2 flex flex-col gap-1 bg-slate-900/30 max-h-[400px] overflow-y-auto custom-scrollbar group">
                {hasSubSections ? (
                    section.subSections!.map((sub, idx) => (
                        <div 
                            key={idx}
                            tabIndex={0}
                            onKeyDown={handleKeyDown}
                            className="bg-slate-900/80 border border-slate-700/50 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-2 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap transition-colors cursor-text mb-1"
                        >
                            <span className="text-slate-600 select-none mr-2">#{idx + 1}</span>
                            {sub}
                        </div>
                    ))
                ) : isListMode ? (
                    lines.map((line, idx) => {
                        if (!line.trim()) return null;
                        return (
                            <div 
                                key={idx} 
                                tabIndex={0}
                                onKeyDown={handleKeyDown}
                                className="bg-slate-950/80 border border-slate-800 hover:border-violet-500/30 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:bg-slate-800 focus:outline-none rounded px-2 py-1.5 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap transition-colors cursor-text"
                            >
                                {line}
                            </div>
                        );
                    })
                ) : (
                    <div 
                        tabIndex={0}
                        className="bg-slate-950/80 border border-slate-800 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 focus:outline-none rounded px-2 py-2 text-[10px] font-mono text-slate-300 break-words whitespace-pre-wrap transition-colors"
                    >
                        {section.content || <span className="text-slate-600 italic">(Nội dung trống)</span>}
                    </div>
                )}
            </div>
        </div>
    );
};
