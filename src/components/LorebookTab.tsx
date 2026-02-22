
import React, { useState, useRef } from 'react';
import type { Lorebook, WorldInfoEntry } from '../types';
import { Loader } from './Loader';
import { useLorebook } from '../contexts/LorebookContext';
import { exportLorebookToJson } from '../services/lorebookExporter';
import { CharacterBookFullScreenView } from './CharacterBookFullScreenView';
import { ExportModal } from './ExportModal';

// --- Card Component cho mỗi Lorebook ---
const LorebookCard: React.FC<{
    lorebook: Lorebook;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ lorebook, onEdit, onDelete }) => {
    const entryCount = lorebook.book?.entries?.length || 0;
    
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-sky-500/50 hover:shadow-lg transition-all flex flex-col h-full group">
            {/* Phần nội dung chính - Nhấn để sửa */}
            <div 
                onClick={onEdit}
                className="p-4 flex-grow cursor-pointer hover:bg-slate-750 transition-colors flex flex-col items-center justify-center min-h-[100px]"
            >
                <h3 className="text-lg font-bold text-slate-200 group-hover:text-sky-400 transition-colors text-center leading-snug break-words w-full">
                    {lorebook.name}
                    <span className="ml-2 text-slate-500 text-base font-normal whitespace-nowrap">
                        ({entryCount})
                    </span>
                </h3>
            </div>
            
            {/* Thanh hành động phía dưới */}
            <div className="grid grid-cols-2 border-t border-slate-700 bg-slate-900/30">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-3 text-sm font-bold text-red-400/80 hover:text-red-300 hover:bg-red-900/20 transition-colors border-r border-slate-700 flex items-center justify-center gap-2"
                    title="Xóa ngay lập tức (Không hỏi lại)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    Xóa
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="p-3 text-sm font-bold text-sky-400/80 hover:text-sky-300 hover:bg-sky-900/20 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    Sửa
                </button>
            </div>
        </div>
    );
};

const UploadCard: React.FC<{
    onUpload: () => void;
    isLoading: boolean;
}> = ({ onUpload, isLoading }) => (
    <div 
        onClick={!isLoading ? onUpload : undefined}
        className={`border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px] transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-sky-500/50 hover:bg-slate-800/30 cursor-pointer group'}`}
    >
        <div className="bg-slate-800 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
            {isLoading ? (
                <Loader message="" />
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            )}
        </div>
        <h3 className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Tải lên Sổ tay Mới</h3>
    </div>
);

export const LorebookTab: React.FC = () => {
    const {
        lorebooks,
        isLoading,
        error,
        loadLorebooks,
        updateLorebook,
        deleteLorebook
    } = useLorebook();
    
    const [editingLorebookName, setEditingLorebookName] = useState<string | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            loadLorebooks(e.target.files);
            e.target.value = '';
        }
    };

    const activeLorebook = lorebooks.find(lb => lb.name === editingLorebookName);

    const handleSave = (updatedEntries: WorldInfoEntry[]) => {
        if (!activeLorebook) return;
        const updatedBook: Lorebook = {
            ...activeLorebook,
            book: {
                ...activeLorebook.book,
                entries: updatedEntries
            }
        };
        updateLorebook(updatedBook);
        setEditingLorebookName(null);
    };

    const handleExportClick = () => {
        if (!activeLorebook) return;
        setIsExportModalOpen(true);
    };

    const performExport = (filename: string) => {
        if (!activeLorebook) return;
        exportLorebookToJson(activeLorebook, filename);
    };

    // Hàm xóa trực tiếp, không hỏi lại (cho nút trên Card)
    const handleDirectDelete = (name: string) => {
        deleteLorebook(name);
    };

    // Hàm xóa có xác nhận (cho nút trong Editor Fullscreen)
    const handleDeleteFromEditor = () => {
        if (!activeLorebook) return;
        if (window.confirm(`Bạn có chắc chắn muốn xóa sổ tay "${activeLorebook.name}" không?`)) {
            deleteLorebook(activeLorebook.name);
            setEditingLorebookName(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Thư viện Sổ tay Thế giới</h2>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {error}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".json"
                onChange={handleFileChange}
                multiple
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {/* Upload Button Card */}
                <UploadCard onUpload={() => fileInputRef.current?.click()} isLoading={isLoading} />

                {/* Existing Lorebooks */}
                {lorebooks.map(lb => (
                    <LorebookCard 
                        key={lb.name} 
                        lorebook={lb} 
                        onEdit={() => setEditingLorebookName(lb.name)} 
                        onDelete={() => handleDirectDelete(lb.name)}
                    />
                ))}
            </div>

            {/* Unified Full Screen Editor */}
            {activeLorebook && (
                <CharacterBookFullScreenView 
                    initialEntries={activeLorebook.book.entries || []}
                    onSave={handleSave}
                    onClose={() => setEditingLorebookName(null)}
                    onExport={handleExportClick}
                    onDelete={handleDeleteFromEditor}
                />
            )}

            <ExportModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={performExport}
                initialFileName={activeLorebook?.name || 'Lorebook'}
                title="Xuất Sổ tay Thế giới"
                fileExtension=".json"
            />
        </div>
    );
};
