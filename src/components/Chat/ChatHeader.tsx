
import React, { useState, useEffect, useRef } from 'react';
import type { VisualState } from '../../types';
import { usePreset } from '../../contexts/PresetContext';
import { useTTS } from '../../contexts/TTSContext';
import { useChatStore } from '../../store/chatStore'; // Import Store for Arena State
import { 
    getConnectionSettings, 
    saveConnectionSettings, 
    GlobalConnectionSettings, 
    MODEL_OPTIONS, 
    PROXY_MODEL_OPTIONS,
    getActiveModel,
    getStoredProxyModels,
    StoredProxyModel
} from '../../services/settingsService';
import { ToggleInput } from '../ui/ToggleInput';

interface ChatHeaderProps {
    characterName: string;
    onBack: () => void;
    isImmersive: boolean;
    setIsImmersive: (value: boolean) => void;
    visualState: VisualState;
    onVisualUpdate: (type: string, value: any) => void; 
    onToggleHUD?: () => void;
    isHUDOpen?: boolean;
    onToggleStatusHUD?: () => void;
    isStatusHUDOpen?: boolean;
    activePresetName?: string;
    onPresetChange?: (presetName: string) => void;
    onToggleAssistant?: () => void;
    isAssistantOpen?: boolean;
    onToggleRpgDashboard?: () => void;
    isRpgDashboardOpen?: boolean;
    hasRpgData?: boolean;
}

const ChatSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    visualState: VisualState;
    onUpdate: (type: string, value: any) => void;
    isHUDOpen?: boolean;
    onToggleHUD?: () => void;
    isStatusHUDOpen?: boolean;
    onToggleStatusHUD?: () => void;
}> = ({ 
    isOpen, onClose, visualState, onUpdate,
    isHUDOpen, onToggleHUD, isStatusHUDOpen, onToggleStatusHUD
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onClose();
                } else if (event.key === 'Tab' && modalRef.current) {
                    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    if (focusableElements.length > 0) {
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
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            setTimeout(() => closeButtonRef.current?.focus(), 100);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="absolute top-14 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 animate-fade-in-up p-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="font-bold text-slate-200">Cài đặt Trò chuyện</h3>
                <button 
                    ref={closeButtonRef} 
                    onClick={onClose} 
                    className="text-slate-400 hover:text-white"
                    aria-label="Đóng cài đặt"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
            
            <div className="space-y-6">
                
                {/* Group 1: Display Tools */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-700/50 pb-1">Công cụ hiển thị</h4>
                    {onToggleHUD && (
                        <ToggleInput 
                            label="Bảng Gỡ lỗi (Debug Panel)" 
                            checked={!!isHUDOpen} 
                            onChange={() => onToggleHUD()} 
                            clean 
                        />
                    )}
                    {onToggleStatusHUD && (
                        <ToggleInput 
                            label="Giao diện Thẻ nổi (Floating HUD)" 
                            checked={!!isStatusHUDOpen} 
                            onChange={() => onToggleStatusHUD()} 
                            clean 
                        />
                    )}
                    
                    {/* NEW: Disable Interactive Mode Toggle */}
                    <ToggleInput 
                        label="Chế độ Văn bản thuần"
                        checked={!!visualState.disableInteractiveMode} 
                        onChange={(v) => onUpdate('disableInteractiveMode', v)} 
                        clean 
                        tooltip="Tắt xử lý Regex/Script/HTML. Hiển thị nội dung thô nguyên bản trong bong bóng chat."
                    />
                </div>

                {/* Group 2: Appearance */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-700/50 pb-1">Giao diện & Hình ảnh</h4>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Link Hình nền (URL)</label>
                        <input 
                            type="text" 
                            value={visualState.backgroundImage || ''} 
                            onChange={(e) => onUpdate('bg', e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                        />
                        <button onClick={() => onUpdate('bg', 'off')} className="text-xs text-red-400 mt-1 hover:underline">Xóa nền</button>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Link Nhạc nền (URL)</label>
                        <input 
                            type="text" 
                            value={visualState.musicUrl || ''} 
                            onChange={(e) => onUpdate('music', e.target.value)}
                            placeholder="https://... (mp3/ogg)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                        />
                        <button onClick={() => onUpdate('music', 'off')} className="text-xs text-red-400 mt-1 hover:underline">Tắt nhạc</button>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Hiệu ứng CSS Global</label>
                        <input 
                            type="text" 
                            value={visualState.globalClass || ''} 
                            onChange={(e) => onUpdate('class', e.target.value)}
                            placeholder="grayscale, blur-sm, sepia..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Group 3: Audio */}
                <div className="space-y-4">
                     <div className="flex items-center justify-between border-b border-slate-700/50 pb-1">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Cấu hình Âm thanh</h4>
                        <ToggleInput 
                            checked={visualState.systemSoundEnabled !== false} 
                            onChange={(v) => onUpdate('systemSoundEnabled', v)} 
                            clean 
                            className="scale-90 origin-right"
                        />
                    </div>

                    <div className={visualState.systemSoundEnabled === false ? 'opacity-50 pointer-events-none' : ''}>
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-slate-400 mb-1">Âm thanh AI Xong (URL)</label>
                            <input 
                                type="text" 
                                value={visualState.aiSoundUrl || ''} 
                                onChange={(e) => onUpdate('aiSoundUrl', e.target.value)}
                                placeholder="Mặc định: 'Pop'"
                                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Âm thanh RPG Xong (URL)</label>
                            <input 
                                type="text" 
                                value={visualState.rpgSoundUrl || ''} 
                                onChange={(e) => onUpdate('rpgSoundUrl', e.target.value)}
                                placeholder="Mặc định: 'Magic Chime'"
                                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">
                            Để trống để sử dụng âm thanh mặc định của hệ thống.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
};

// --- Quick Config Modal (Model + Preset) ---
const QuickConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    activePresetName?: string;
    onPresetChange?: (name: string) => void;
    // Data for live tuning connection
    onConnectionChange: () => void; // Trigger parent refresh
}> = ({ isOpen, onClose, activePresetName, onPresetChange, onConnectionChange }) => {
    const { presets } = usePreset();
    const modalRef = useRef<HTMLDivElement>(null);
    const [conn, setConn] = useState<GlobalConnectionSettings>(getConnectionSettings());
    const [proxyModels, setProxyModels] = useState<StoredProxyModel[]>([]);

    // Sync state when modal opens
    useEffect(() => {
        if (isOpen) {
            setConn(getConnectionSettings());
            const stored = getStoredProxyModels();
            setProxyModels(stored);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // --- Handlers for Model Config ---
    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSource = e.target.value as any;
        const newConn = { ...conn, source: newSource };
        saveConnectionSettings(newConn);
        setConn(newConn);
        onConnectionChange(); // Notify parent to update badge
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const newVal = e.target.value;
        const newConn = { ...conn };
        
        if (conn.source === 'gemini') newConn.gemini_model = newVal;
        else if (conn.source === 'proxy') newConn.proxy_model = newVal;
        else if (conn.source === 'openrouter') newConn.openrouter_model = newVal;
        
        saveConnectionSettings(newConn);
        setConn(newConn);
        onConnectionChange(); // Notify parent to update badge
    };

    const currentOptions = conn.source === 'gemini' 
        ? MODEL_OPTIONS 
        : (proxyModels.length > 0 ? proxyModels : PROXY_MODEL_OPTIONS);

    return (
        <div ref={modalRef} className="absolute top-14 left-16 md:left-auto md:right-1/4 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 animate-fade-in-up flex flex-col max-h-[70vh]">
            
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cấu hình Nhanh</h3>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-3 space-y-4">
                
                {/* SECTION 1: MODEL CONFIG */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Nguồn & Model (Brain)</label>
                    
                    {/* Source Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-12 shrink-0">Nguồn:</span>
                        <select 
                            value={conn.source} 
                            onChange={handleSourceChange}
                            className="flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="gemini">Google Gemini</option>
                            <option value="openrouter">OpenRouter</option>
                            <option value="proxy">Proxy</option>
                        </select>
                    </div>

                    {/* Model Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-12 shrink-0">Model:</span>
                        {conn.source === 'openrouter' ? (
                            <input 
                                type="text"
                                value={conn.openrouter_model || ''}
                                onChange={handleModelChange}
                                placeholder="google/gemini-..."
                                className="flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none"
                            />
                        ) : (
                            <select 
                                value={conn.source === 'gemini' ? conn.gemini_model : conn.proxy_model} 
                                onChange={handleModelChange}
                                className="flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none"
                            >
                                {currentOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="h-px bg-slate-700/50"></div>

                {/* SECTION 2: PRESET LIST */}
                <div className="space-y-1">
                     <label className="text-[10px] font-bold text-amber-400 uppercase mb-2 block">Preset (Soul)</label>
                     <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {presets.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => { if(onPresetChange) onPresetChange(preset.name); onClose(); }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                    activePresetName === preset.name 
                                    ? 'bg-amber-900/30 text-amber-100 border border-amber-500/30' 
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                                }`}
                                aria-label={`Chọn preset ${preset.name}`}
                            >
                                <span className="truncate">{preset.name}</span>
                                {activePresetName === preset.name && <span className="text-[8px] text-amber-400">●</span>}
                            </button>
                        ))}
                     </div>
                </div>

            </div>
        </div>
    );
};

// --- TTS Controls Component ---
const TTSControls: React.FC = () => {
    const { isPlaying, isPaused, autoPlayEnabled, toggleAutoPlay, togglePause, skip, isLoading, settings } = useTTS();
    const ttsEnabled = settings.tts_enabled;

    if (!ttsEnabled) return null;

    return (
        <div className="flex items-center bg-slate-800/80 rounded-full px-2 py-1 gap-1 border border-slate-600/50 mr-2">
            {/* Auto Play Toggle */}
            <button
                onClick={toggleAutoPlay}
                className={`p-1.5 rounded-full transition-colors ${autoPlayEnabled ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                title={autoPlayEnabled ? "Tự động đọc: BẬT" : "Tự động đọc: TẮT"}
                aria-label={autoPlayEnabled ? "Tắt tự động đọc" : "Bật tự động đọc"}
                aria-pressed={autoPlayEnabled}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Play/Pause/Loading/Skip Group (Visible when active or paused) */}
            {(isPlaying || isPaused || isLoading) && (
                <>
                    <div className="w-px h-3 bg-slate-600 mx-1"></div>
                    
                    {/* Pause/Resume */}
                    <button
                        onClick={togglePause}
                        className={`p-1.5 rounded-full text-slate-200 hover:text-white hover:bg-slate-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isPaused ? "Tiếp tục" : "Tạm dừng"}
                        aria-label={isPaused ? "Tiếp tục đọc" : "Tạm dừng đọc"}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                             <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : isPaused ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        )}
                    </button>

                    {/* Skip */}
                    <button
                        onClick={skip}
                        className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Bỏ qua (Next)"
                        aria-label="Bỏ qua câu hiện tại"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L9 12.323V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 009 6v1.677L4.555 5.168z" /></svg>
                    </button>
                </>
            )}
        </div>
    );
};

// --- NEW UNIFIED COMPONENT ---
const UnifiedConfigBadge: React.FC<{
    presetName?: string;
    onClick?: () => void;
    // Force refresh key to update visuals
    refreshKey?: number;
}> = ({ presetName, onClick, refreshKey }) => {
    const conn = getConnectionSettings();
    const activeModel = getActiveModel();
    
    // Determine styles based on connection source
    const getStyles = () => {
         if (conn.source === 'openrouter') return {
             bg: 'bg-purple-900/40 hover:bg-purple-900/60',
             border: 'border-purple-500/30',
             text: 'text-purple-200'
         };
         if (conn.source === 'proxy') return {
             bg: 'bg-cyan-900/40 hover:bg-cyan-900/60',
             border: 'border-cyan-500/30',
             text: 'text-cyan-200'
         };
         // Gemini default
         return {
             bg: 'bg-sky-900/40 hover:bg-sky-900/60',
             border: 'border-sky-500/30',
             text: 'text-sky-200'
         };
    };

    const style = getStyles();
    
    const getSourceLabel = () => {
        if (conn.source === 'openrouter') return 'OR';
        if (conn.source === 'proxy') return 'PRX';
        return 'AI';
    };

    return (
        <button
            onClick={onClick}
            className={`group flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all duration-200 ${style.bg} ${style.border} ${style.text} max-w-[280px] sm:max-w-[350px] shadow-sm`}
            title="Nhấn để cấu hình Nhanh (Model & Preset)"
        >
            {/* Model Part */}
            <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[60%]">
                <span className="opacity-60 text-[9px] uppercase tracking-wider font-bold">{getSourceLabel()}</span>
                <span className="truncate font-bold">{activeModel}</span>
            </div>

            {/* Vertical Divider */}
            <div className={`w-px h-3 ${style.text} opacity-20`}></div>

            {/* Preset Part */}
            <div className="flex items-center gap-1.5 shrink-0 min-w-0 max-w-[40%]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                <span className="truncate opacity-90">{presetName || 'Default'}</span>
            </div>
        </button>
    );
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
    characterName, onBack, isImmersive, setIsImmersive, visualState, onVisualUpdate, 
    onToggleHUD, isHUDOpen, onToggleStatusHUD, isStatusHUDOpen,
    activePresetName, onPresetChange, onToggleAssistant, isAssistantOpen,
    onToggleRpgDashboard, isRpgDashboardOpen, hasRpgData
}) => {
    const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
    const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // To force re-render of badge
    const triggerRef = useRef<HTMLButtonElement>(null);
    
    // Arena Mode Logic
    const { isArenaMode, setArenaMode, arenaModelId, setArenaModelId } = useChatStore();
    const [proxyModels, setProxyModels] = useState<StoredProxyModel[]>([]);

    useEffect(() => {
        setProxyModels(getStoredProxyModels());
    }, [isArenaMode]);

    const handleCloseMenu = () => {
        setIsSettingsMenuOpen(false);
        triggerRef.current?.focus();
    }

    const handleConnectionChange = () => {
        setRefreshKey(prev => prev + 1);
    }

    const headerClasses = isImmersive
        ? "p-3 bg-slate-900/60 backdrop-blur-md border-b border-white/10 flex items-center gap-4 relative z-10 transition-all duration-300 hover:bg-slate-900/80"
        : "p-3 border-b border-slate-700 flex items-center gap-4 relative z-10 bg-slate-800/80 backdrop-blur-md";

    // --- ARENA MODEL SELECTION LOGIC (Option A) ---
    // Only show models compatible with current source
    const connection = getConnectionSettings();
    let arenaModelOptions: { id: string, name: string }[] = [];

    if (connection.source === 'gemini') {
        arenaModelOptions = MODEL_OPTIONS;
    } else if (connection.source === 'proxy') {
        // Dedup proxy models + default options
        const combined = [...proxyModels, ...PROXY_MODEL_OPTIONS];
        const unique = new Map<string, {id: string, name: string}>();
        combined.forEach(m => unique.set(m.id, m));
        arenaModelOptions = Array.from(unique.values());
    } else {
         // Fallback for OpenRouter etc: Use Proxy Options list + Defaults as best guess
         // Since fetching OR models is async in settings, we keep it simple here.
         arenaModelOptions = PROXY_MODEL_OPTIONS;
    }

    return (
        <div className={headerClasses}>
            <button 
                onClick={onBack} 
                className="text-slate-400 hover:text-sky-400 transition-colors" 
                title="Quay lại"
                aria-label="Quay lại sảnh chờ"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                     <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </button>
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-slate-200 truncate">{characterName}</h2>
                </div>
                {!isImmersive && (
                    <div className="flex items-center gap-3">
                        <UnifiedConfigBadge 
                            presetName={activePresetName} 
                            onClick={() => onPresetChange && setIsConfigMenuOpen(!isConfigMenuOpen)}
                            refreshKey={refreshKey}
                        />
                        {/* Arena Mode Toggle */}
                        <div className="flex items-center gap-2 bg-slate-900/50 rounded-full px-2 py-0.5 border border-slate-700">
                             <button
                                onClick={() => setArenaMode(!isArenaMode)}
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-colors ${isArenaMode ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                title={isArenaMode ? "Tắt chế độ Đấu trường" : "Bật chế độ Đấu trường (So sánh Model)"}
                             >
                                VS
                             </button>
                             
                             {isArenaMode && (
                                <select
                                    value={arenaModelId || ''}
                                    onChange={(e) => setArenaModelId(e.target.value)}
                                    className="bg-transparent text-[10px] text-rose-300 font-medium outline-none max-w-[100px]"
                                    title="Chọn Model Đối thủ (Cùng nguồn)"
                                >
                                    <option value="" className="bg-slate-800">Chọn Đối thủ</option>
                                    {arenaModelOptions.map((m, idx) => (
                                        <option key={`${m.id}-${idx}`} value={m.id} className="bg-slate-800">{m.name}</option>
                                    ))}
                                </select>
                             )}
                        </div>

                         {/* Quick Config Modal attached to the badge area */}
                         <div className="relative">
                            <QuickConfigModal 
                                isOpen={isConfigMenuOpen}
                                onClose={() => setIsConfigMenuOpen(false)}
                                activePresetName={activePresetName}
                                onPresetChange={onPresetChange}
                                onConnectionChange={handleConnectionChange}
                            />
                         </div>
                    </div>
                )}
            </div>

            {/* TTS Controls */}
            <TTSControls />

            {/* --- ACTION BUTTONS --- */}
            
            {/* RPG Dashboard Toggle */}
            {hasRpgData && onToggleRpgDashboard && (
                <button
                    onClick={onToggleRpgDashboard}
                    className={`p-2 rounded-full transition-colors ${isRpgDashboardOpen ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Bật/Tắt RPG Dashboard (Mythic Engine)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2.25a3 3 0 013 3v1h2a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1h2zm3-1a1 1 0 011-1h.5a1 1 0 011 1v1h-2.5V5zm7 4a1 1 0 10-2 0 1 1 0 002 0zm-9 0a1 1 0 10-2 0 1 1 0 002 0zm9 3a1 1 0 10-2 0 1 1 0 002 0zm-9 0a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            {/* Assistant Toggle */}
            {onToggleAssistant && (
                <button
                    onClick={onToggleAssistant}
                    className={`p-2 rounded-full transition-colors ${isAssistantOpen ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Bật/Tắt Trợ lý Co-pilot"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                </button>
            )}

            {/* Chat Settings Toggle (Consolidated) */}
            <div className="relative">
                <button 
                    ref={triggerRef}
                    onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                    className={`p-2 rounded-full transition-colors ${isSettingsMenuOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Cài đặt Trò chuyện (Giao diện & Công cụ)"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                </button>
                <ChatSettingsModal 
                    isOpen={isSettingsMenuOpen} 
                    onClose={handleCloseMenu}
                    visualState={visualState}
                    onUpdate={onVisualUpdate}
                    isHUDOpen={isHUDOpen}
                    onToggleHUD={onToggleHUD}
                    isStatusHUDOpen={isStatusHUDOpen}
                    onToggleStatusHUD={onToggleStatusHUD}
                />
            </div>
        </div>
    );
};
