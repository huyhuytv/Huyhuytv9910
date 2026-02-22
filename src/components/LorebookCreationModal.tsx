
import React, { useState, useEffect, useRef } from 'react';
import type { Lorebook, WorldInfoEntry } from '../types';
import { useLorebook } from '../contexts/LorebookContext';
import { Loader } from './Loader';

interface LorebookCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    keyword: string;
    contentPromise: Promise<string>;
}

export const LorebookCreationModal: React.FC<LorebookCreationModalProps> = ({
    isOpen,
    onClose,
    keyword,
    contentPromise,
}) => {
    const { lorebooks, updateLorebook } = useLorebook();
    const [keys, setKeys] = useState(keyword);
    const [content, setContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [selectedLorebookName, setSelectedLorebookName] = useState('');

    const modalRef = useRef<HTMLDivElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            triggerElementRef.current = document.activeElement as HTMLElement;

            // Reset state on open
            setIsGenerating(true);
            setKeys(keyword);
            setContent('');
            if (lorebooks.length > 0 && !selectedLorebookName) {
                setSelectedLorebookName(lorebooks[0].name);
            }

            contentPromise.then(generatedContent => {
                setContent(generatedContent);
                setIsGenerating(false);
            }).catch(error => {
                setContent(`Lỗi khi tạo nội dung: ${error.message}`);
                setIsGenerating(false);
            });

            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onClose();
                    return;
                }
                if (event.key === 'Tab' && modalRef.current) {
                    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    if (focusableElements.length === 0) return;
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (event.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            event.preventDefault();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            event.preventDefault();
                        }
                    }
                }
            };
            
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                triggerElementRef.current?.focus();
            };
        }
    }, [isOpen, keyword, contentPromise, lorebooks, selectedLorebookName, onClose]);

    const handleSave = () => {
        if (!selectedLorebookName || !keys.trim() || !content.trim()) {
            alert("Vui lòng điền từ khóa, nội dung và chọn một sổ tay.");
            return;
        }

        const targetLorebook = lorebooks.find(lb => lb.name === selectedLorebookName);
        if (!targetLorebook) {
            alert("Không tìm thấy sổ tay đã chọn.");
            return;
        }

        const newEntry: WorldInfoEntry = {
            keys: keys.split(',').map(k => k.trim()).filter(Boolean),
            content: content,
            comment: keys.split(',')[0].trim(), // Use first key as comment
            enabled: true,
            uid: `entry_${Date.now()}`
        };

        const updatedBook = {
            ...targetLorebook.book,
            entries: [...(targetLorebook.book.entries || []), newEntry]
        };
        
        const updatedLorebook: Lorebook = {
            ...targetLorebook,
            book: updatedBook
        };

        updateLorebook(updatedLorebook);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                ref={modalRef}
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-sky-400">Tạo Mục Sổ tay AI Mới</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Đóng">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <main className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Từ khóa (phân tách bằng dấu phẩy)</label>
                        <input
                            type="text"
                            value={keys}
                            onChange={e => setKeys(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nội dung</label>
                        <div className="relative min-h-[200px]">
                            {isGenerating && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-700/50 rounded-md">
                                    <Loader message="Gemini đang viết mô tả..." />
                                </div>
                            )}
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={12}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200"
                                disabled={isGenerating}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Lưu vào Sổ tay</label>
                        <select
                            value={selectedLorebookName}
                            onChange={e => setSelectedLorebookName(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200"
                            disabled={lorebooks.length === 0}
                        >
                            {lorebooks.length > 0 ? (
                                lorebooks.map(lb => <option key={lb.name} value={lb.name}>{lb.name}</option>)
                            ) : (
                                <option>Không có sổ tay nào để lưu</option>
                            )}
                        </select>
                    </div>
                </main>

                <footer className="p-4 border-t border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300">
                        Hủy
                    </button>
                    <button onClick={handleSave} disabled={isGenerating || lorebooks.length === 0} className="px-4 py-2 text-sm font-medium rounded-md bg-sky-600 hover:bg-sky-700 text-white disabled:bg-slate-600 disabled:cursor-not-allowed">
                        Lưu
                    </button>
                </footer>
            </div>
        </div>
    );
};
