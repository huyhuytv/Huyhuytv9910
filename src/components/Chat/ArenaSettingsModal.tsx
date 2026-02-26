import React, { useState, useEffect, useMemo } from 'react';
import { useChatStore } from '../../store/chatStore';
import { 
    MODEL_OPTIONS, 
    PROXY_MODEL_OPTIONS, 
    getOpenRouterApiKey, 
    getProxyUrl, 
    getProxyPassword, 
    getProxyLegacyMode,
    getStoredProxyModels,
    getProxyProfiles,
    ProxyProfile
} from '../../services/settingsService';
import { getOpenRouterModels } from '../../services/geminiService';
import { fetchProxyModels } from '../../services/api/proxyApi';
import type { OpenRouterModel } from '../../types';
import { Loader } from '../Loader';
import { useToast } from '../ToastSystem';

interface ArenaSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ArenaSettingsModal: React.FC<ArenaSettingsModalProps> = ({ isOpen, onClose }) => {
    const { 
        arenaProvider, 
        setArenaProvider, 
        arenaModelId, 
        setArenaModelId,
        arenaUserProfileId,
        setArenaUserProfileId
    } = useChatStore();
    
    const { showToast } = useToast();
    const modalRef = React.useRef<HTMLDivElement>(null);

    // Local state for fetched models
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
    const [proxyModels, setProxyModels] = useState<{id: string, name: string}[]>([]);
    const [proxyProfiles, setProxyProfiles] = useState<ProxyProfile[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize provider if null
    useEffect(() => {
        if (isOpen && !arenaProvider) {
            setArenaProvider('gemini'); // Default
        }
        if (isOpen) {
            setProxyProfiles(getProxyProfiles());
        }
    }, [isOpen, arenaProvider, setArenaProvider]);

    // Close on click outside
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

    // FETCH MODELS LOGIC
    useEffect(() => {
        if (!isOpen) return;

        const fetchModels = async () => {
            setIsLoading(true);
            setError(null);

            try {
                if (arenaProvider === 'openrouter') {
                    const key = getOpenRouterApiKey();
                    if (!key) {
                        setError("Chưa cấu hình API Key cho OpenRouter trong Cài đặt chính.");
                        setIsLoading(false);
                        return;
                    }
                    const models = await getOpenRouterModels();
                    setOpenRouterModels(models);
                } 
                else if (arenaProvider === 'proxy') {
                    // Determine URL/Key source: Profile or Global
                    let url = getProxyUrl();
                    let password = getProxyPassword();
                    let legacy = getProxyLegacyMode();

                    if (arenaUserProfileId) {
                        const profile = proxyProfiles.find(p => p.id === arenaUserProfileId);
                        if (profile) {
                            url = profile.url;
                            password = profile.password;
                            legacy = profile.legacyMode;
                        }
                    }

                    if (!url) {
                        setError("Chưa cấu hình Proxy URL.");
                        setIsLoading(false);
                        return;
                    }
                    
                    // Try to use stored models first for instant UI, then update
                    // Only use stored global models if NO profile is selected
                    if (!arenaUserProfileId) {
                        const stored = getStoredProxyModels();
                        if (stored.length > 0) setProxyModels(stored);
                    } else {
                        // Clear models temporarily when switching profiles to avoid confusion
                        // Or keep empty until fetch
                        setProxyModels([]); 
                    }

                    const models = await fetchProxyModels(url, password, legacy);
                    setProxyModels(models);
                }
            } catch (e: any) {
                console.error("Arena fetch error:", e);
                setError(e.message || "Lỗi tải danh sách model.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchModels();
    }, [arenaProvider, isOpen, arenaUserProfileId, proxyProfiles]); // Re-fetch when profile changes

    // Determine available options based on provider
    const currentOptions = useMemo(() => {
        if (arenaProvider === 'gemini') {
            return MODEL_OPTIONS;
        }
        if (arenaProvider === 'openrouter') {
            return openRouterModels.map(m => ({ 
                id: m.id, 
                name: `${m.name} (${m.pricing.prompt === '0' ? 'Free' : '$'})` 
            }));
        }
        if (arenaProvider === 'proxy') {
            return proxyModels.length > 0 ? proxyModels : PROXY_MODEL_OPTIONS;
        }
        return [];
    }, [arenaProvider, openRouterModels, proxyModels]);

    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="absolute top-16 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 animate-fade-in-up flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-rose-500 font-bold">VS</span>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cài đặt Đấu trường</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                
                {/* Provider Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Nhà cung cấp (Đối thủ)</label>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        {(['gemini', 'openrouter', 'proxy'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => {
                                    setArenaProvider(p);
                                    // Reset profile when switching away from proxy, or keep it?
                                    // Better to keep it or reset? Let's keep it simple.
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${
                                    arenaProvider === p 
                                    ? 'bg-rose-600 text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                {p === 'gemini' ? 'Gemini' : p === 'openrouter' ? 'OR' : 'Proxy'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* PROXY PROFILE SELECTOR (NEW) */}
                {arenaProvider === 'proxy' && (
                    <div className="space-y-2 animate-fade-in-up">
                        <label className="text-[10px] font-bold text-emerald-400 uppercase">Cấu hình Proxy (Profile)</label>
                        <select
                            value={arenaUserProfileId || ''}
                            onChange={(e) => setArenaUserProfileId(e.target.value || null)}
                            className="w-full bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-emerald-500 outline-none"
                        >
                            <option value="">-- Mặc định (Global Settings) --</option>
                            {proxyProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Model Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-sky-400 uppercase">Model Đối thủ</label>
                    
                    {isLoading ? (
                        <div className="py-2 flex justify-center">
                            <Loader message="Đang tải danh sách..." />
                        </div>
                    ) : error ? (
                        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                            {error}
                        </div>
                    ) : (
                        <select
                            value={arenaModelId || ''}
                            onChange={(e) => setArenaModelId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-rose-500 outline-none"
                        >
                            <option value="">-- Chọn Model --</option>
                            {currentOptions.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="text-[10px] text-slate-500 italic">
                    * Lưu ý: Cấu hình chi tiết (API Key, URL) được lấy từ Cài đặt chính hoặc Profile đã chọn.
                </div>
            </div>
        </div>
    );
};
