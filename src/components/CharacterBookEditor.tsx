
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WorldInfoEntry } from '../types';
import { CopyButton } from './ui/CopyButton';
import { ToggleInput } from './ui/ToggleInput';
import { LabeledInput } from './ui/LabeledInput';
import { LabeledTextarea } from './ui/LabeledTextarea';
import { PlacementControl } from './ui/PlacementControl';
import { FilterButton } from './ui/FilterButton';

// --- Modal Component ---

interface WorldInfoEditModalProps {
    isOpen: boolean;
    entry: WorldInfoEntry | null;
    onSave: (updatedEntry: WorldInfoEntry) => void;
    onClose: () => void;
}

const WorldInfoEditModal: React.FC<WorldInfoEditModalProps> = ({ isOpen, entry, onSave, onClose }) => {
    const [editedEntry, setEditedEntry] = useState<WorldInfoEntry | null>(null);
    
    const modalRef = useRef<HTMLDivElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (entry) {
            setEditedEntry(JSON.parse(JSON.stringify(entry)));
        } else {
            setEditedEntry(null);
        }
    }, [entry, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        triggerElementRef.current = document.activeElement as HTMLElement;
        setTimeout(() => {
            const firstFocusable = modalRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
            firstFocusable?.focus();
        }, 100);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            triggerElementRef.current?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen || !editedEntry) return null;

    const handleChange = (field: keyof WorldInfoEntry, value: any) => {
        setEditedEntry(prev => prev ? { ...prev, [field]: value } : null);
    };

    // Helper to map string placement to 'before' | 'after' | undefined for the control
    const getPlacementValue = (pos: string | undefined): 'before' | 'after' | undefined => {
        const valStr = String(pos || '');
        if (valStr.includes('before')) return 'before';
        if (valStr.includes('after')) return 'after';
        return undefined;
    };

    // Helper to map control value back to string
    const handlePlacementChange = (val: 'before' | 'after' | undefined) => {
        let newPos = '';
        if (val === 'before') newPos = 'before_char';
        if (val === 'after') newPos = 'after_char';
        handleChange('position', newPos);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div ref={modalRef} className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-sky-400">Chỉnh sửa Mục World Info</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        aria-label="Đóng chỉnh sửa"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <main className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <LabeledInput label="Tiêu đề (Bình luận)" value={editedEntry.comment || ''} onChange={e => handleChange('comment', e.target.value)} placeholder="Đặt tên cho mục này..." />
                        <LabeledInput label="Từ khóa chính" value={(editedEntry.keys || []).join(', ')} onChange={e => handleChange('keys', e.target.value.split(',').map(k => k.trim()).filter(Boolean))} placeholder="Ví dụ: gươm, kiếm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <LabeledInput label="Từ khóa phụ" value={(editedEntry.secondary_keys || []).join(', ')} onChange={e => handleChange('secondary_keys', e.target.value.split(',').map(k => k.trim()).filter(Boolean))} placeholder="Ví dụ: cổ đại" />
                        <div className="grid grid-cols-2 gap-4">
                             <LabeledInput label="Thứ tự chèn" type="number" value={String(editedEntry.insertion_order ?? 100)} onChange={e => handleChange('insertion_order', parseInt(e.target.value))} />
                             <PlacementControl value={getPlacementValue(editedEntry.position)} onChange={handlePlacementChange} />
                        </div>
                    </div>

                    <LabeledTextarea label="Nội dung" value={editedEntry.content || ''} onChange={e => handleChange('content', e.target.value)} rows={8} />

                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-400 uppercase">Trạng thái</label>
                            <ToggleInput label="Đã bật" checked={editedEntry.enabled !== false} onChange={v => handleChange('enabled', v)} clean />
                            <ToggleInput label="Hằng số" checked={!!editedEntry.constant} onChange={v => handleChange('constant', v)} clean tooltip="Luôn luôn gửi đi, bỏ qua kiểm tra từ khóa." />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-400 uppercase">Logic</label>
                            <ToggleInput label="Chọn lọc" checked={!!editedEntry.selective} onChange={v => handleChange('selective', v)} clean tooltip="Chỉ kích hoạt khi từ khóa xuất hiện." />
                            <ToggleInput label="Dùng Regex" checked={!!editedEntry.use_regex} onChange={v => handleChange('use_regex', v)} clean tooltip="Xử lý từ khóa như biểu thức chính quy." />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <LabeledInput label="Sticky (Duy trì)" type="number" value={String(editedEntry.sticky || 0)} onChange={e => handleChange('sticky', parseInt(e.target.value))} />
                             <LabeledInput label="Cooldown (Hồi chiêu)" type="number" value={String(editedEntry.cooldown || 0)} onChange={e => handleChange('cooldown', parseInt(e.target.value))} />
                        </div>
                    </div>
                </main>

                <footer className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">Hủy</button>
                    <button onClick={() => { onSave(editedEntry); onClose(); }} className="px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors">Lưu Thay đổi</button>
                </footer>
            </div>
        </div>
    );
};

// --- List Item Component ---

interface WorldInfoItemProps {
    entry: WorldInfoEntry;
    index: number;
    onUpdate: (index: number, updatedEntry: WorldInfoEntry) => void;
    onRemove: (index: number) => void;
    onEdit: (index: number) => void;
}

const WorldInfoItem: React.FC<WorldInfoItemProps> = ({ entry, index, onUpdate, onRemove, onEdit }) => {
    const isMarkedForDeletion = !!entry.__deleted;

    return (
        <div 
            onClick={() => !isMarkedForDeletion && onEdit(index)}
            className={`group flex items-start gap-3 p-4 border rounded-lg transition-all cursor-pointer focus:ring-2 focus:ring-sky-500 focus:outline-none 
                ${isMarkedForDeletion 
                    ? 'bg-red-900/20 border-red-500/50 opacity-75 hover:opacity-100 hover:bg-red-900/30' 
                    : `bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-sky-500/50 ${!entry.enabled ? 'opacity-60' : ''}`
                }
            `}
        >
            <div onClick={e => e.stopPropagation()} className="flex-shrink-0 self-start mt-1">
                <ToggleInput checked={entry.enabled !== false} onChange={v => onUpdate(index, { ...entry, enabled: v })} disabled={isMarkedForDeletion} clean />
            </div>

            <div className="flex-grow min-w-0 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-bold text-base truncate m-0 ${isMarkedForDeletion ? 'text-red-300 line-through' : (entry.enabled !== false ? 'text-slate-200' : 'text-slate-500 line-through')}`}>
                        {entry.comment || 'Không có tiêu đề'}
                        {isMarkedForDeletion && <span className="ml-2 text-xs text-red-400 font-normal italic">(Đã đánh dấu xóa)</span>}
                    </h4>
                    {entry.keys && entry.keys.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border truncate max-w-[200px] ${isMarkedForDeletion ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                            {entry.keys.join(', ')}
                        </span>
                    )}
                </div>
                <div className={`text-xs font-mono p-3 rounded border whitespace-pre-wrap break-words select-text cursor-text transition-colors ${isMarkedForDeletion ? 'bg-red-950/30 text-red-200/70 border-red-900/30' : 'bg-slate-900/50 text-slate-300 border-slate-700/50 hover:bg-slate-900/70'}`} onClick={e => e.stopPropagation()}>
                    {entry.content || <span className="text-slate-600 italic">(Trống)</span>}
                </div>
            </div>

            <div className="flex flex-col gap-3 flex-shrink-0 items-end self-start">
                <button onClick={(e) => { e.stopPropagation(); onUpdate(index, { ...entry, constant: !entry.constant }); }} disabled={isMarkedForDeletion} className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded border transition-all shadow-sm ${entry.constant ? 'bg-amber-900/40 text-amber-400 border-amber-600' : 'bg-slate-700 text-slate-500 border-slate-600'}`}>
                    {entry.constant ? 'Hằng số: BẬT' : 'Hằng số: TẮT'}
                </button>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(index); }} 
                        disabled={isMarkedForDeletion} 
                        className="p-1.5 rounded-md transition-colors text-slate-400 hover:text-sky-400 hover:bg-slate-700"
                        aria-label={`Chỉnh sửa mục ${entry.comment}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(index); }} 
                        className={`p-1.5 rounded-md transition-colors ${isMarkedForDeletion ? 'text-green-400 hover:bg-green-900/30' : 'text-slate-500 hover:text-red-400 hover:bg-slate-700'}`}
                        aria-label={isMarkedForDeletion ? `Khôi phục mục ${entry.comment}` : `Xóa mục ${entry.comment}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            {isMarkedForDeletion 
                                ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                                : <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            }
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Container Component ---

interface CharacterBookEditorProps {
    entries: WorldInfoEntry[];
    onUpdate: (entries: WorldInfoEntry[]) => void;
    className?: string;
}

export const CharacterBookEditor: React.FC<CharacterBookEditorProps> = ({ entries, onUpdate, className = '' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'constant'>('all');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleUpdateEntry = useCallback((index: number, updatedEntry: WorldInfoEntry) => {
        const newEntries = [...entries];
        if (!updatedEntry.uid) updatedEntry.uid = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        newEntries[index] = updatedEntry;
        onUpdate(newEntries);
    }, [entries, onUpdate]);

    const handleRemoveEntry = useCallback((index: number) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], __deleted: !newEntries[index].__deleted };
        onUpdate(newEntries);
    }, [entries, onUpdate]);

    const handleAddEntry = useCallback(() => {
        const newEntry: WorldInfoEntry = { 
            keys: [], content: '', comment: 'Mục mới', enabled: true, insertion_order: 100, 
            selective: true, constant: false, use_regex: false, position: 'before_char', 
            uid: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        onUpdate([...entries, newEntry]);
        setEditingIndex(entries.length); 
    }, [entries, onUpdate]);

    const filteredItems = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
        let matchesSearch = true;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            matchesSearch = (entry.comment || '').toLowerCase().includes(lower) || (entry.keys || []).some(k => k.toLowerCase().includes(lower)) || (entry.content || '').toLowerCase().includes(lower);
        }
        let matchesFilter = true;
        if (filter === 'enabled') matchesFilter = entry.enabled !== false;
        else if (filter === 'disabled') matchesFilter = entry.enabled === false;
        else if (filter === 'constant') matchesFilter = entry.constant === true;
        return matchesSearch && matchesFilter;
    });

    const counts = {
        all: entries.length,
        enabled: entries.filter(e => e.enabled !== false).length,
        disabled: entries.filter(e => e.enabled === false).length,
        constant: entries.filter(e => e.constant === true).length,
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            <div className="flex flex-col gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="pl-9 w-full bg-slate-700 border border-slate-600 rounded-md py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" />
                    </div>
                    <div className="text-xs text-slate-500 font-mono whitespace-nowrap">{filteredItems.length} / {entries.length}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterButton filter="all" currentFilter={filter} onClick={setFilter} label="Tất cả" count={counts.all} />
                    <FilterButton filter="enabled" currentFilter={filter} onClick={setFilter} label="Đang bật" count={counts.enabled} />
                    <FilterButton filter="disabled" currentFilter={filter} onClick={setFilter} label="Đã tắt" count={counts.disabled} />
                    <FilterButton filter="constant" currentFilter={filter} onClick={setFilter} label="Hằng số" count={counts.constant} />
                </div>
            </div>

            <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-lg border border-dashed border-slate-700"><p>Không tìm thấy mục nào.</p></div>
                ) : (
                    filteredItems.map(({ entry, index }) => (
                        <WorldInfoItem key={entry.uid || index} entry={entry} index={index} onUpdate={handleUpdateEntry} onRemove={handleRemoveEntry} onEdit={() => setEditingIndex(index)} />
                    ))
                )}
            </div>

            <button onClick={handleAddEntry} className="w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 border border-slate-600 hover:border-sky-500/50 group shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                <span>Thêm Mục Mới</span>
            </button>

            <WorldInfoEditModal isOpen={editingIndex !== null} entry={editingIndex !== null ? entries[editingIndex] : null} onClose={() => setEditingIndex(null)} onSave={(updatedEntry) => { if (editingIndex !== null) handleUpdateEntry(editingIndex, updatedEntry); }} />
        </div>
    );
};
