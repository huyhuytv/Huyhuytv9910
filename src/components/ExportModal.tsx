
import React, { useState, useEffect, useRef } from 'react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (fileName: string) => void;
    initialFileName: string;
    title: string;
    fileExtension: string; // e.g., ".json" or ".png"
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    initialFileName, 
    title,
    fileExtension 
}) => {
    const [fileName, setFileName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset and focus whenever modal opens
    useEffect(() => {
        if (isOpen) {
            // Remove extension if present in initial name for easier editing
            const cleanName = initialFileName.replace(new RegExp(`${fileExtension}$`, 'i'), '');
            setFileName(cleanName);
            
            // Focus and select all text after a short delay to allow render
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 50);
        }
    }, [isOpen, initialFileName, fileExtension]);

    const handleConfirm = () => {
        if (!fileName.trim()) return;
        
        // Basic sanitization: remove forbidden characters for filenames
        const safeName = fileName.replace(/[<>:"/\\|?*]/g, '');
        const finalName = `${safeName}${fileExtension}`;
        
        onConfirm(finalName);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-sky-400">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition-colors"
                        aria-label="Đóng"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Tên tập tin</label>
                        <div className="relative flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition pr-16"
                                placeholder="Nhập tên file..."
                            />
                            <span className="absolute right-3 text-slate-500 select-none text-sm font-mono">
                                {fileExtension}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Nhấn Enter để tải xuống. Ký tự đặc biệt sẽ tự động bị loại bỏ.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-900/20 transition-colors"
                    >
                        Tải xuống
                    </button>
                </div>
            </div>
        </div>
    );
};
