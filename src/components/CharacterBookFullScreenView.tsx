
import React, { useState, useEffect, useMemo } from 'react';
import type { WorldInfoEntry, Lorebook } from '../types';
import { CharacterBookEditor } from './CharacterBookEditor';
import { useToast } from './ToastSystem';
import { useLorebook } from '../contexts/LorebookContext'; 
import _ from 'lodash';

interface CharacterBookFullScreenViewProps {
    initialEntries: WorldInfoEntry[]; // All entries (internal + linked)
    initialAttached?: string[]; // List of linked book names (metadata)
    onClose: () => void;
    onSave: (entries: WorldInfoEntry[], attached?: string[]) => void;
    onExport?: () => void; 
    onDelete?: () => void; 
}

// --- IMPORT / LINK MODAL ---
const AddBookModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    lorebooks: Lorebook[];
    onAction: (mode: 'merge' | 'link', book: Lorebook) => void;
}> = ({ isOpen, onClose, lorebooks, onAction }) => {
    const [selectedName, setSelectedName] = useState('');
    const selectedBook = lorebooks.find(b => b.name === selectedName);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Thêm Sổ tay vào Nhân vật</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Chọn Sổ tay Thế giới</label>
                        <select 
                            value={selectedName}
                            onChange={(e) => setSelectedName(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="">-- Chọn sổ tay --</option>
                            {lorebooks.map(lb => (
                                <option key={lb.name} value={lb.name}>{lb.name} ({lb.book.entries.length} mục)</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <button 
                            onClick={() => selectedBook && onAction('link', selectedBook)}
                            disabled={!selectedBook}
                            className="p-4 rounded-lg bg-amber-900/20 border border-amber-600/30 hover:bg-amber-900/40 hover:border-amber-500 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="text-amber-400 font-bold mb-1 group-hover:text-amber-300">🔗 Liên kết (Link)</div>
                            <p className="text-xs text-slate-400">Tạo một bản sao riêng của sổ tay này và gắn nhãn. Bạn có thể chỉnh sửa trực tiếp.</p>
                        </button>

                        <button 
                            onClick={() => selectedBook && onAction('merge', selectedBook)}
                            disabled={!selectedBook}
                            className="p-4 rounded-lg bg-sky-900/20 border border-sky-600/30 hover:bg-sky-900/40 hover:border-sky-500 transition-all text-left group disabled:opacity-50"
                        >
                            <div className="text-sky-400 font-bold mb-1 group-hover:text-sky-300">📥 Gộp (Merge)</div>
                            <p className="text-xs text-slate-400">Trộn lẫn các mục vào Sổ tay Gốc (Nội bộ). Mất đi ranh giới giữa các sổ.</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CharacterBookFullScreenView: React.FC<CharacterBookFullScreenViewProps> = ({ 
    initialEntries, 
    initialAttached = [], 
    onClose, 
    onSave,
}) => {
    // Contexts
    const { lorebooks } = useLorebook();
    const { showToast } = useToast();

    // --- STATE INITIALIZATION (LAZY) ---
    // Khởi tạo state một lần duy nhất khi mount để tránh bị reset do re-render
    const [localEntries, setLocalEntries] = useState<WorldInfoEntry[]>(() => {
        let entries = JSON.parse(JSON.stringify(initialEntries));
        
        // Ensure UID
        entries = entries.map((e: WorldInfoEntry) => ({
            ...e,
            uid: e.uid || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));

        // Hydration: Tự động điền nội dung cho các sổ tay đã liên kết nhưng chưa có dữ liệu (Legacy support)
        if (initialAttached && initialAttached.length > 0) {
            initialAttached.forEach(bookName => {
                const hasData = entries.some((e: WorldInfoEntry) => e.source_lorebook === bookName);
                if (!hasData) {
                    const globalBook = lorebooks.find(lb => lb.name === bookName);
                    if (globalBook && globalBook.book.entries.length > 0) {
                        const newEntries = JSON.parse(JSON.stringify(globalBook.book.entries));
                        newEntries.forEach((e: any) => {
                            e.uid = `hydrated_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                            e.source_lorebook = bookName;
                        });
                        entries = [...entries, ...newEntries];
                    }
                }
            });
        }
        
        return entries;
    });

    const [attachedBooks, setAttachedBooks] = useState<string[]>(() => [...initialAttached]);
    
    // Active Book ID: '__internal__' or the name of a linked book
    const [activeBookId, setActiveBookId] = useState<string>('__internal__'); 
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // --- MAIN SAVE ---
    const handleMainSave = () => {
        const cleanEntries = localEntries.filter(e => !e.__deleted);
        onSave(cleanEntries, attachedBooks);
    };

    // --- EDITING LOGIC ---
    
    // Filter entries based on the active tab
    const currentViewEntries = useMemo(() => {
        if (activeBookId === '__internal__') {
            // Show entries that have NO source or source is explicitly internal
            return localEntries.filter(e => !e.source_lorebook || e.source_lorebook === '__internal__');
        } else {
            // Show entries belonging to the specific linked book
            return localEntries.filter(e => e.source_lorebook === activeBookId);
        }
    }, [localEntries, activeBookId]);

    // Handle updates from the Editor component
    const handleEditorUpdate = (updatedSubset: WorldInfoEntry[]) => {
        setLocalEntries(prev => {
            // 1. Identify entries NOT in the current view (preserve them)
            const otherEntries = prev.filter(e => {
                const eSource = e.source_lorebook || '__internal__';
                return eSource !== activeBookId;
            });

            // 2. Process the updated subset
            // Ensure any NEW entries created in this view get the correct source tag
            const processedSubset = updatedSubset.map(e => ({
                ...e,
                source_lorebook: activeBookId === '__internal__' ? undefined : activeBookId
            }));

            // 3. Combine
            return [...otherEntries, ...processedSubset];
        });
    };

    // --- BOOK MANAGEMENT ---

    const handleAddBookAction = (mode: 'merge' | 'link', book: Lorebook) => {
        const entriesToImport = book.book?.entries || [];

        if (mode === 'link') {
            if (attachedBooks.includes(book.name)) {
                showToast("Sổ tay này đã được liên kết rồi.", "warning");
                return;
            }
            
            // Link Mode: Import entries TAGGED with the book name
            const newEntries = JSON.parse(JSON.stringify(entriesToImport));
            newEntries.forEach((e: any) => {
                e.uid = `linked_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                e.source_lorebook = book.name; // Tag source explicitly
                if (e.enabled === undefined) e.enabled = true;
            });

            setLocalEntries(prev => [...prev, ...newEntries]);
            setAttachedBooks(prev => [...prev, book.name]);
            showToast(`Đã liên kết và nhập ${newEntries.length} mục từ: ${book.name}`, "success");
            
            // Switch view immediately to the new book
            setActiveBookId(book.name); 
        } else {
            // Merge Mode: Import entries WITHOUT tag (Internal)
            const newEntries = JSON.parse(JSON.stringify(entriesToImport));
            newEntries.forEach((e: any) => {
                e.uid = `merged_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                e.source_lorebook = undefined; // Force internal
                if (e.enabled === undefined) e.enabled = true;
            });
            
            setLocalEntries(prev => [...prev, ...newEntries]);
            showToast(`Đã gộp ${newEntries.length} mục vào Sổ tay Gốc.`, "success");
            setActiveBookId('__internal__');
        }
        setIsAddModalOpen(false);
    };

    const handleDetach = (bookName: string) => {
        // Remove from metadata list
        setAttachedBooks(prev => prev.filter(b => b !== bookName));
        
        // Remove ALL entries associated with this book
        setLocalEntries(prev => prev.filter(e => e.source_lorebook !== bookName));
        
        if (activeBookId === bookName) setActiveBookId('__internal__');
        showToast(`Đã gỡ liên kết và xóa dữ liệu của: ${bookName}`, "info");
    };

    const handleMergeLinked = (bookName: string) => {
        // Convert entries of this book to Internal
        setLocalEntries(prev => prev.map(e => {
            if (e.source_lorebook === bookName) {
                return { ...e, source_lorebook: undefined };
            }
            return e;
        }));
        
        // Remove from attached list
        setAttachedBooks(prev => prev.filter(b => b !== bookName));
        
        setActiveBookId('__internal__');
        showToast("Đã chuyển đổi dữ liệu thành Nội bộ.", "success");
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                        📖 Quản lý Sổ tay & Liên kết
                    </h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleMainSave()} 
                        className="px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-lg shadow-sky-900/20 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Lưu & Áp dụng
                    </button>
                </div>
            </div>

            {/* Body: Sidebar + Main */}
            <div className="flex flex-grow overflow-hidden">
                
                {/* Sidebar */}
                <div className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col shrink-0">
                    <div className="p-3 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Danh sách Sổ tay
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {/* Internal Book */}
                        <button
                            onClick={() => setActiveBookId('__internal__')}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                                activeBookId === '__internal__' 
                                ? 'bg-sky-600/20 border-sky-500 text-sky-300' 
                                : 'bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-bold text-sm truncate">Sổ tay Gốc (Nội bộ)</span>
                                <span className="text-xs opacity-70">
                                    {localEntries.filter(e => !e.source_lorebook).length} mục
                                </span>
                            </div>
                            {activeBookId === '__internal__' && <span className="w-2 h-2 rounded-full bg-sky-400"></span>}
                        </button>

                        <div className="h-px bg-slate-700 my-2"></div>

                        {/* Linked Books */}
                        {attachedBooks.map((bookName) => {
                            const count = localEntries.filter(e => e.source_lorebook === bookName).length;
                            const isActive = activeBookId === bookName;
                            
                            return (
                                <div 
                                    key={bookName}
                                    onClick={() => setActiveBookId(bookName)}
                                    className={`w-full p-3 rounded-lg border transition-all flex flex-col gap-2 cursor-pointer group ${
                                        isActive
                                        ? 'bg-amber-900/20 border-amber-500 text-amber-300'
                                        : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-medium text-sm truncate flex-grow">🔗 {bookName}</span>
                                            <span className="text-xs opacity-70">{count} mục</span>
                                        </div>
                                        {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-2"></span>}
                                    </div>
                                    
                                    {/* Actions for Linked Book (Visible when active or hover) */}
                                    <div className={`flex gap-2 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleMergeLinked(bookName); }}
                                            className="text-[10px] bg-slate-700 hover:bg-sky-700 hover:text-white px-2 py-1 rounded text-slate-300 flex-1 border border-slate-600"
                                            title="Chuyển thành nội bộ"
                                        >
                                            Gộp
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDetach(bookName); }}
                                            className="text-[10px] bg-slate-700 hover:bg-red-700 hover:text-white px-2 py-1 rounded text-slate-300 border border-slate-600"
                                            title="Gỡ liên kết và xóa dữ liệu"
                                        >
                                            Gỡ
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-3 border-t border-slate-700 bg-slate-800/30">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-bold text-xs rounded border border-slate-600 border-dashed flex items-center justify-center gap-2"
                        >
                            <span>+</span> Thêm / Liên kết
                        </button>
                    </div>
                </div>

                {/* Main Content (Editor) */}
                <div className="flex-grow bg-slate-900/50 relative overflow-hidden flex flex-col">
                    {/* Header bar for current book */}
                    <div className="px-6 py-2 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center text-xs text-slate-400">
                        <span>Đang chỉnh sửa: <strong className={activeBookId === '__internal__' ? 'text-sky-400' : 'text-amber-400'}>
                            {activeBookId === '__internal__' ? 'Sổ tay Gốc' : activeBookId}
                        </strong></span>
                        {activeBookId !== '__internal__' && (
                            <span className="italic opacity-80">
                                Mọi thay đổi ở đây chỉ ảnh hưởng đến nhân vật này.
                            </span>
                        )}
                    </div>

                    <div className="flex-grow p-4 sm:p-6 overflow-hidden">
                        <CharacterBookEditor 
                            entries={currentViewEntries} 
                            onUpdate={handleEditorUpdate} 
                            className="h-full"
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddBookModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                lorebooks={lorebooks}
                onAction={handleAddBookAction}
            />
        </div>
    );
};
