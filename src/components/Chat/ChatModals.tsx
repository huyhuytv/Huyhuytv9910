
import React, { useState, useEffect } from 'react';
import { WorldInfoManagerModal } from '../WorldInfoManagerModal';
import { LorebookCreationModal } from '../LorebookCreationModal';
import type { WorldInfoEntry } from '../../types';
import { generateLorebookEntry } from '../../services/geminiService';
import type { ChatMessage, Lorebook } from '../../types';

// Define AuthorNoteModal locally to avoid circular dependency with ChatTester
const AuthorNoteModalLocal: React.FC<{
    isOpen: boolean;
    initialNote: string;
    onSave: (newNote: string) => void;
    onClose: () => void;
}> = ({ isOpen, initialNote, onSave, onClose }) => {
    const [note, setNote] = useState(initialNote);

    useEffect(() => {
        if (isOpen) {
            setNote(initialNote);
        }
    }, [isOpen, initialNote]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-sky-400">Ghi chú của Tác giả (Bền bỉ)</h2>
                    <p className="text-sm text-slate-400 mt-1">Ghi chú này sẽ được chèn vào lời nhắc cho mỗi lượt gửi cho đến khi bạn xóa nó.</p>
                </header>
                <main className="p-6">
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={8}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500"
                        placeholder="Ví dụ: [[Chỉ dẫn: Nhân vật phải luôn nói một cách trang trọng.]]"
                    />
                </main>
                <footer className="p-4 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300">Hủy</button>
                    <button onClick={() => onSave(note)} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 hover:bg-sky-700 text-white">Lưu</button>
                </footer>
            </div>
        </div>
    );
};

interface ChatModalsProps {
    // Author Note
    isAuthorNoteOpen: boolean;
    setIsAuthorNoteOpen: (isOpen: boolean) => void;
    authorNote: string;
    updateAuthorNote: (note: string) => void;

    // World Info
    isWorldInfoOpen: boolean;
    setIsWorldInfoOpen: (isOpen: boolean) => void;
    worldInfoEntries: WorldInfoEntry[];
    worldInfoState: Record<string, boolean>;
    worldInfoPinned: Record<string, boolean>;
    worldInfoPlacement: Record<string, 'before' | 'after' | undefined>;
    updateWorldInfoState: (state: Record<string, boolean>) => void;
    updateWorldInfoPinned: (state: Record<string, boolean>) => void;
    updateWorldInfoPlacement: (state: Record<string, 'before' | 'after' | undefined>) => void;

    // Lorebook Creator
    isLorebookCreatorOpen: boolean;
    setIsLorebookCreatorOpen: (isOpen: boolean) => void;
    lorebookKeyword: string;
    setLorebookKeyword: (val: string) => void;
    
    // Services for Lorebook Creator
    messages: ChatMessage[];
    longTermSummaries: string[];
    lorebooks: Lorebook[];
}

export const ChatModals: React.FC<ChatModalsProps> = ({
    isAuthorNoteOpen, setIsAuthorNoteOpen, authorNote, updateAuthorNote,
    isWorldInfoOpen, setIsWorldInfoOpen, worldInfoEntries, worldInfoState, worldInfoPinned, worldInfoPlacement, updateWorldInfoState, updateWorldInfoPinned, updateWorldInfoPlacement,
    isLorebookCreatorOpen, setIsLorebookCreatorOpen, lorebookKeyword, setLorebookKeyword,
    messages, longTermSummaries, lorebooks
}) => {
    
    const [isCreatorModalGenerating, setIsCreatorModalGenerating] = useState(false);
    const [contentPromise, setContentPromise] = useState<Promise<string>>(Promise.resolve(''));
    const [promiseKeyword, setPromiseKeyword] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Handle the intermediate step where user types keyword
    const handleGenerateLorebookClick = () => {
        const keyword = lorebookKeyword.trim();
        if (!keyword) {
            alert("Vui lòng nhập từ khóa.");
            return;
        }

        const promise = generateLorebookEntry(
            keyword,
            messages,
            longTermSummaries,
            lorebooks
        );
        
        setPromiseKeyword(keyword);
        setContentPromise(promise);
        setIsCreatorModalGenerating(true); // Open the actual modal
        setShowForm(false); // Hide local form
        setLorebookKeyword('');
    };
    
    // Expose a way for parent to trigger the form
    useEffect(() => {
        if (isLorebookCreatorOpen && !isCreatorModalGenerating && !showForm) {
             setShowForm(true);
        }
    }, [isLorebookCreatorOpen]);

    // If the parent closes the modal flow
    useEffect(() => {
        if (!isLorebookCreatorOpen) {
            setShowForm(false);
            setIsCreatorModalGenerating(false);
        }
    }, [isLorebookCreatorOpen]);

    const handleCloseCreator = () => {
        setIsCreatorModalGenerating(false);
        setIsLorebookCreatorOpen(false);
    };

    return (
        <>
            <AuthorNoteModalLocal
                isOpen={isAuthorNoteOpen}
                initialNote={authorNote}
                onSave={(newNote) => {
                    updateAuthorNote(newNote);
                    setIsAuthorNoteOpen(false);
                }}
                onClose={() => setIsAuthorNoteOpen(false)}
            />

            <WorldInfoManagerModal
                isOpen={isWorldInfoOpen}
                onClose={() => setIsWorldInfoOpen(false)}
                entries={worldInfoEntries}
                worldInfoState={worldInfoState}
                worldInfoPinned={worldInfoPinned}
                worldInfoPlacement={worldInfoPlacement}
                onUpdate={updateWorldInfoState}
                onUpdatePinned={updateWorldInfoPinned}
                onUpdatePlacement={updateWorldInfoPlacement}
            />
            
            {/* Simple overlay form for keyword input */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setIsLorebookCreatorOpen(false)}>
                     <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-sky-400 mb-4">Tạo Mục Sổ tay AI</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={lorebookKeyword}
                                onChange={(e) => setLorebookKeyword(e.target.value)}
                                placeholder="Nhập từ khóa hoặc tên mục..."
                                className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-sky-500"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setIsLorebookCreatorOpen(false)}
                                    className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleGenerateLorebookClick}
                                    className="text-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                                >
                                    Tạo
                                </button>
                            </div>
                        </div>
                     </div>
                </div>
            )}

             <LorebookCreationModal
                isOpen={isCreatorModalGenerating}
                onClose={handleCloseCreator}
                keyword={promiseKeyword}
                contentPromise={contentPromise}
            />
        </>
    );
};