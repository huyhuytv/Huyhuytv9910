
import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { SillyTavernPreset, PromptEntry } from '../types';
import { MacroReference } from './MacroReference';
import { PromptEditModal } from './PromptEditModal';
import { CopyButton } from './ui/CopyButton';
import { ToggleInput } from './ui/ToggleInput';
import { FilterButton } from './ui/FilterButton';

interface PromptItemProps {
    prompt: PromptEntry;
    index: number;
    onUpdate: (index: number, updatedPrompt: PromptEntry) => void;
    onRemove: (index: number) => void;
    onEdit: (index: number) => void;
    movingPromptIndex: number | null;
    onSelectToMove: (index: number) => void;
    onMoveTo: (destinationIndex: number) => void;
    onCancelMove: () => void;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt, index, onUpdate, onRemove, onEdit, movingPromptIndex, onSelectToMove, onMoveTo, onCancelMove }) => {
    const isBeingMoved = movingPromptIndex === index;
    const isMoveMode = movingPromptIndex !== null;

    return (
        <div className={`bg-slate-800 rounded-lg border border-slate-700 transition-all duration-200 ${isBeingMoved ? 'ring-2 ring-sky-500 shadow-lg' : ''} ${isMoveMode && !isBeingMoved ? 'opacity-60' : ''}`}>
            <div className="flex items-center p-3">
                <div className="flex items-center gap-2 flex-shrink-0 mr-4" onClick={(e) => e.stopPropagation()}>
                    <ToggleInput label="" checked={prompt.enabled ?? false} onChange={v => onUpdate(index, { ...prompt, enabled: v })} clean />
                </div>
                <div className="flex-grow cursor-pointer overflow-hidden" onClick={(e) => { e.stopPropagation(); onEdit(index); }}>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 truncate">
                        <h3 className={`font-medium text-base flex-shrink-0 ${prompt.enabled ? 'text-slate-200' : 'text-slate-500 line-through'}`}>{prompt.name || 'Untitled Prompt'}</h3>
                        {prompt.content && <p className="text-sm text-slate-500 truncate italic">{prompt.content.replace(/\n/g, ' ')}</p>}
                    </div>
                </div>
                
                <div className="flex items-center ml-4 flex-shrink-0 gap-1">
                     {isMoveMode ? (
                        isBeingMoved ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onCancelMove(); }} 
                                className="p-2 bg-red-600/50 hover:bg-red-500/50 text-white rounded-md transition-colors"
                                aria-label="Hủy di chuyển"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        ) : (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onMoveTo(index); }} 
                                className="px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-md transition-colors"
                                aria-label="Di chuyển đến vị trí này"
                            >
                                Di chuyển đến đây
                            </button>
                        )
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSelectToMove(index); }} 
                            className="p-2 text-slate-400 hover:text-sky-400 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                            aria-label="Chọn để di chuyển"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    )}
                    
                    {!isMoveMode && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(index); }} 
                            className="p-2 text-slate-400 hover:text-sky-400 transition-colors"
                            aria-label={`Chỉnh sửa lời nhắc ${prompt.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(index); }} 
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        aria-label={`Xóa lời nhắc ${prompt.name}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface PromptEditorProps {
    preset: SillyTavernPreset;
    onUpdate: (preset: SillyTavernPreset) => void;
}

type PromptFilter = 'all' | 'enabled' | 'disabled';

const FinalPromptPreview: React.FC<{ prompts: PromptEntry[] }> = ({ prompts }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const finalPrompt = useMemo(() => prompts.filter(p => p.enabled).map(p => p.include_title ? `--- ${p.name} ---\n${p.content}` : p.content).join('\n\n'), [prompts]);

    return (
        <details className="bg-slate-800/50 rounded-xl shadow-lg open:mb-6 transition-all duration-300" open={isExpanded} onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}>
            <summary className="p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center">
                <span>Xem trước Lời nhắc Gửi đi Cuối cùng</span>
                 <svg className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="p-4 pt-0">
                <div className="relative">
                    <textarea readOnly value={finalPrompt} rows={15} className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-3 text-slate-300 font-mono text-xs focus:outline-none" />
                     <div className="absolute top-2 right-2"><CopyButton textToCopy={finalPrompt} absolute={false} /></div>
                </div>
            </div>
        </details>
    );
};

export const PromptEditor: React.FC<PromptEditorProps> = ({ preset, onUpdate }) => {
    const [filter, setFilter] = useState<PromptFilter>('all');
    const [movingPromptIndex, setMovingPromptIndex] = useState<number | null>(null);
    const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
    const triggerButtonRef = useRef<HTMLElement | null>(null);
    const prompts = preset.prompts || [];

    const handleUpdatePrompt = useCallback((index: number, updatedPrompt: PromptEntry) => {
        const newPrompts = [...prompts];
        newPrompts[index] = updatedPrompt;
        onUpdate({ ...preset, prompts: newPrompts });
    }, [prompts, preset, onUpdate]);

    const handleRemovePrompt = useCallback((index: number) => {
        if (movingPromptIndex === index) setMovingPromptIndex(null);
        const newPrompts = prompts.filter((_, i) => i !== index);
        onUpdate({ ...preset, prompts: newPrompts });
    }, [prompts, preset, onUpdate, movingPromptIndex]);
    
    const handleAddPrompt = useCallback(() => {
        const newPrompt: PromptEntry = { identifier: `prompt_${Date.now()}`, name: 'New Prompt', role: 'system', content: '', enabled: true, include_title: false };
        onUpdate({ ...preset, prompts: [...prompts, newPrompt] });
    }, [prompts, preset, onUpdate]);

    const handleOpenEditModal = useCallback((originalIndex: number) => {
        triggerButtonRef.current = document.activeElement as HTMLElement;
        setEditingPromptIndex(originalIndex);
    }, []);
    
    const handleCloseEditModal = useCallback(() => {
        setEditingPromptIndex(null);
        setTimeout(() => triggerButtonRef.current?.focus(), 0);
    }, []);

    const handleSavePrompt = useCallback((updatedPrompt: PromptEntry) => {
        if (editingPromptIndex !== null) handleUpdatePrompt(editingPromptIndex, updatedPrompt);
        handleCloseEditModal();
    }, [editingPromptIndex, handleUpdatePrompt, handleCloseEditModal]);

    const filteredPrompts = useMemo(() => {
        return prompts
            .map((prompt, index) => ({ prompt, originalIndex: index }))
            .filter(({ prompt }) => {
                if (filter === 'enabled') return prompt.enabled === true;
                if (filter === 'disabled') return !prompt.enabled;
                return true; 
            });
    }, [prompts, filter]);
    
    const handleMoveTo = useCallback((destinationOriginalIndex: number) => {
        if (movingPromptIndex === null || movingPromptIndex === destinationOriginalIndex) {
            setMovingPromptIndex(null);
            return;
        }
        const items = [...prompts];
        const [reorderedItem] = items.splice(movingPromptIndex, 1);
        const effectiveDestinationIndex = destinationOriginalIndex > movingPromptIndex ? destinationOriginalIndex - 1 : destinationOriginalIndex;
        items.splice(effectiveDestinationIndex, 0, reorderedItem);
        onUpdate({ ...preset, prompts: items });
        setMovingPromptIndex(null);
    }, [prompts, preset, onUpdate, movingPromptIndex]);

    const handleExportFilteredPrompts = useCallback(() => {
        if (!preset || filteredPrompts.length === 0) {
            alert('Không có lời nhắc nào để xuất cho bộ lọc hiện tại.');
            return;
        }
        let content = filter === 'all' 
            ? filteredPrompts.map(({ prompt }) => `--- Lời nhắc: ${prompt.name || 'Không có tiêu đề'} ---\n\n${prompt.content || ''}`).join('\n\n\n')
            : filteredPrompts.map(({ prompt }) => prompt.content || '').join('\n\n----------------------------------------\n\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const presetName = preset.name.replace(/\.json$/i, '');
        a.download = `${presetName}_prompts_${filter}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [preset, filteredPrompts, filter]);

    return (
        <div className="space-y-6">
            <MacroReference />
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-2 bg-slate-800/50 rounded-lg">
                <div className="p-1 bg-slate-900 rounded-lg flex space-x-1">
                    <FilterButton filter="all" currentFilter={filter} onClick={setFilter} label="Tất cả" />
                    <FilterButton filter="enabled" currentFilter={filter} onClick={setFilter} label="Đã bật" />
                    <FilterButton filter="disabled" currentFilter={filter} onClick={setFilter} label="Đã tắt" />
                </div>
                 <button onClick={handleExportFilteredPrompts} disabled={filteredPrompts.length === 0} className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 text-sky-300 bg-sky-800/50 hover:bg-sky-700/60 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    <span>Xuất theo bộ lọc</span>
                </button>
            </div>

            <div id="prompt-list" className="space-y-3">
                {filteredPrompts.map(({ prompt, originalIndex }) => (
                    <PromptItem
                        key={prompt.identifier || originalIndex}
                        prompt={prompt}
                        index={originalIndex}
                        onUpdate={handleUpdatePrompt}
                        onRemove={handleRemovePrompt}
                        movingPromptIndex={movingPromptIndex}
                        onSelectToMove={setMovingPromptIndex}
                        onMoveTo={handleMoveTo}
                        onCancelMove={() => setMovingPromptIndex(null)}
                        onEdit={handleOpenEditModal}
                    />
                ))}
                {filteredPrompts.length === 0 && <div className="text-center py-8 text-slate-500"><p>Không có lời nhắc nào khớp với bộ lọc này.</p></div>}
            </div>

            <button onClick={handleAddPrompt} className="w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 border border-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                <span>Thêm Lời nhắc Mới</span>
            </button>
            
            <PromptEditModal isOpen={editingPromptIndex !== null} prompt={editingPromptIndex !== null ? prompts[editingPromptIndex] : null} onSave={handleSavePrompt} onClose={handleCloseEditModal} />
            <FinalPromptPreview prompts={prompts} />
        </div>
    );
};
