
import React, { useRef, useState, useEffect } from 'react';
import { PresetEditor } from './PresetEditor';
import { PromptEditor } from './PromptEditor';
import { exportPresetToJson } from '../services/presetExporter';
import { usePreset } from '../contexts/PresetContext';
import { Loader } from './Loader';
import { ExportModal } from './ExportModal';
import { useToast } from './ToastSystem';

type ActiveSubTab = 'config' | 'prompts';

const SubTabButton: React.FC<{
  tabId: ActiveSubTab;
  currentTab: ActiveSubTab;
  onClick: (tabId: ActiveSubTab) => void;
  children: React.ReactNode;
}> = ({ tabId, currentTab, onClick, children }) => (
  <button
    role="tab"
    id={`preset-subtab-${tabId}`}
    aria-controls={`preset-subtabpanel-${tabId}`}
    aria-selected={currentTab === tabId}
    onClick={() => onClick(tabId)}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none ${
      currentTab === tabId
        ? 'bg-sky-600 text-white'
        : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`}
  >
    {children}
  </button>
);

// --- Generic Name Input Modal (Used for Create, Clone, Rename) ---
interface PresetNameModalProps {
    isOpen: boolean;
    mode: 'create' | 'clone' | 'rename' | null;
    originalName: string;
    onClose: () => void;
    onConfirm: (newName: string) => void;
}

const PresetNameModal: React.FC<PresetNameModalProps> = ({ isOpen, mode, originalName, onClose, onConfirm }) => {
    const [newName, setNewName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && mode) {
            if (mode === 'clone') setNewName(`${originalName} (Copy)`);
            else if (mode === 'rename') setNewName(originalName);
            else setNewName('New Preset'); // Create mode

            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 50);
        }
    }, [isOpen, mode, originalName]);

    const handleConfirm = () => {
        if (!newName.trim()) return;
        onConfirm(newName.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const getTitle = () => {
        if (mode === 'create') return 'Tạo Preset Mới';
        if (mode === 'rename') return 'Đổi tên Preset';
        return 'Nhân bản Preset';
    };

    if (!isOpen || !mode) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-sm animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tên Preset</label>
                    <input
                        ref={inputRef}
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 transition"
                        placeholder="Nhập tên..."
                    />
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium">Hủy</button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold">Xác nhận</button>
                </div>
            </div>
        </div>
    );
};


export const PresetTab: React.FC = () => {
    const {
        presets,
        activePresetName,
        isLoading,
        error,
        addPreset,
        deleteActivePreset,
        updateActivePreset,
        setActivePresetName,
        revertActivePreset,
        duplicatePreset,
        createPreset,
        renamePreset,
    } = usePreset();
    const [activeSubTab, setActiveSubTab] = React.useState<'config' | 'prompts'>('config');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    
    // Unified Modal State
    const [nameModalMode, setNameModalMode] = useState<'create' | 'clone' | 'rename' | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const activePreset = presets.find(p => p.name === activePresetName) || null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addPreset(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleExportClick = () => {
        if (!activePreset) return;
        setIsExportModalOpen(true);
    }

    const performExport = (filename: string) => {
        if (!activePreset) return;
        exportPresetToJson(activePreset, filename);
    }

    // --- CRUD Handlers ---

    const handleNameModalConfirm = async (newName: string) => {
        try {
            if (nameModalMode === 'create') {
                await createPreset(newName);
                showToast(`Đã tạo preset mới: "${newName}"`, 'success');
            } else if (nameModalMode === 'clone' && activePreset) {
                await duplicatePreset(activePreset.name, newName);
                showToast(`Đã nhân bản thành: "${newName}"`, 'success');
            } else if (nameModalMode === 'rename' && activePreset) {
                await renamePreset(activePreset.name, newName);
                showToast(`Đã đổi tên thành: "${newName}"`, 'success');
            }
        } catch (e) {
            showToast(`Lỗi: ${e instanceof Error ? e.message : String(e)}`, 'error');
        } finally {
            setNameModalMode(null);
        }
    };

    if (isLoading && presets.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader message="Đang tải presets..." />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Panel: Preset List and Actions */}
            <div className="md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-200">Danh sách Preset</h3>
                     <button 
                        onClick={() => setNameModalMode('create')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold transition-colors"
                    >
                        + Mới
                    </button>
                </div>
                
                <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    {presets.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => setActivePresetName(preset.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium truncate ${
                                activePresetName === preset.name
                                    ? 'bg-sky-600/30 text-white ring-1 ring-sky-500/50'
                                    : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>

                <div className="mt-auto space-y-2 pt-3 border-t border-slate-700/50">
                    {error && <p className="text-red-400 text-xs p-2 bg-red-900/30 rounded">{error}</p>}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="sr-only"
                        accept=".json"
                        onChange={handleFileChange}
                    />
                    
                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs"
                        >
                            Tải lên
                        </button>
                         <button
                            onClick={handleExportClick}
                            disabled={!activePreset}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs disabled:opacity-50"
                        >
                           Xuất
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setNameModalMode('clone')}
                            disabled={!activePreset}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs disabled:opacity-50"
                        >
                            Nhân bản
                        </button>
                        <button
                            onClick={() => setNameModalMode('rename')}
                            disabled={!activePreset}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs disabled:opacity-50"
                        >
                            Đổi tên
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={revertActivePreset}
                            disabled={!activePreset}
                             className="w-full bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 font-semibold py-1.5 px-3 text-xs rounded-lg transition-colors duration-200 disabled:opacity-50 border border-amber-900/50"
                        >
                           Hoàn tác
                        </button>
                        <button
                            onClick={deleteActivePreset}
                            disabled={!activePreset || activePreset.name === "Mặc định"}
                            className="w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg transition-colors duration-200 disabled:opacity-50 border border-red-900/50"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="md:col-span-2">
                {activePreset ? (
                    <div>
                        <div role="tablist" className="mb-4 flex justify-center">
                             <div className="p-1 bg-slate-800 rounded-lg flex space-x-1">
                                <SubTabButton tabId="config" currentTab={activeSubTab} onClick={setActiveSubTab}>Cấu hình</SubTabButton>
                                <SubTabButton tabId="prompts" currentTab={activeSubTab} onClick={setActiveSubTab}>Lời nhắc</SubTabButton>
                             </div>
                        </div>
                        <div
                          className="focus:outline-none"
                          tabIndex={0}
                        >
                            {activeSubTab === 'config' && <PresetEditor preset={activePreset} onUpdate={updateActivePreset} />}
                            {activeSubTab === 'prompts' && <PromptEditor preset={activePreset} onUpdate={updateActivePreset} />}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700">
                       <div className="text-center text-slate-500">
                           <p className="font-semibold">Chọn hoặc tạo mới một preset</p>
                       </div>
                    </div>
                )}
            </div>

            <ExportModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={performExport}
                initialFileName={activePreset?.name || 'Preset'}
                title="Xuất Preset"
                fileExtension=".json"
            />
            
            <PresetNameModal
                isOpen={!!nameModalMode}
                mode={nameModalMode}
                onClose={() => setNameModalMode(null)}
                originalName={activePreset?.name || ''}
                onConfirm={handleNameModalConfirm}
            />
        </div>
    );
};
