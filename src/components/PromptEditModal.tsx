
import React, { useState, useEffect, useRef } from 'react';
import type { PromptEntry } from '../types';
import { LabeledInput } from './ui/LabeledInput';
import { LabeledTextarea } from './ui/LabeledTextarea';
import { ToggleInput } from './ui/ToggleInput';

interface PromptEditModalProps {
    isOpen: boolean;
    prompt: PromptEntry | null;
    onSave: (updatedPrompt: PromptEntry) => void;
    onClose: () => void;
}

export const PromptEditModal: React.FC<PromptEditModalProps> = ({ isOpen, prompt, onSave, onClose }) => {
    const [editedPrompt, setEditedPrompt] = useState<PromptEntry | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (prompt) {
            setEditedPrompt(JSON.parse(JSON.stringify(prompt)));
        } else {
            setEditedPrompt(null);
        }
    }, [prompt, isOpen]);
    
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => { closeButtonRef.current?.focus(); }, 100);
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') onClose();
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen || !editedPrompt) return null;

    const handleChange = (field: keyof PromptEntry, value: any) => {
        setEditedPrompt(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
            <div ref={modalRef} className={`bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`} onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-400">Chỉnh sửa Lời nhắc</h2>
                    <button ref={closeButtonRef} onClick={onClose} className="p-1 text-slate-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <LabeledInput label="Tên Lời nhắc" value={editedPrompt.name} onChange={e => handleChange('name', e.target.value)} />
                    <LabeledTextarea label="Nội dung" value={editedPrompt.content} onChange={e => handleChange('content', e.target.value)} rows={12} />
                    <ToggleInput label="Gửi kèm Tiêu đề" checked={editedPrompt.include_title ?? false} onChange={v => handleChange('include_title', v)} />
                </main>
                <footer className="p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 text-slate-300 bg-slate-700 hover:bg-slate-600">Hủy</button>
                    <button onClick={() => onSave(editedPrompt)} className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 bg-sky-600 text-white hover:bg-sky-700">Lưu Thay đổi</button>
                </footer>
            </div>
        </div>
    );
};
