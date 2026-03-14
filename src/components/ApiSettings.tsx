
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getConnectionSettings, 
    saveConnectionSettings, 
    MODEL_OPTIONS, 
    PROXY_MODEL_OPTIONS,
    getApiSettings, 
    saveApiSettings, 
    getOpenRouterApiKey, 
    saveOpenRouterApiKey, 
    getProxyUrl, 
    saveProxyUrl, 
    getProxyPassword, 
    saveProxyPassword, 
    getProxyLegacyMode, 
    saveProxyLegacyMode, 
    getProxyForTools, 
    saveProxyForTools,
    getProxyProfiles,
    saveProxyProfiles,
    getStoredProxyModels,
    saveStoredProxyModels,
    GlobalConnectionSettings,
    CompletionSource,
    ProxyProtocol,
    ProxyProfile,
    StoredProxyModel
} from '../services/settingsService';
import { validateOpenRouterKey, getOpenRouterModels } from '../services/geminiService';
import { fetchProxyModels } from '../services/api/proxyApi';
import type { OpenRouterModel } from '../types';
import { Loader } from './Loader';
import { ToggleInput } from './ui/ToggleInput';
import { SelectInput } from './ui/SelectInput';
import { LabeledInput } from './ui/LabeledInput';
import { useToast } from './ToastSystem';

import { useGeminiModels } from '../hooks/useGeminiModels';

// New Reusable Component for Model Selection with "Other" option
const ModelSelectorWithCustom: React.FC<{
    label: string;
    description?: string;
    value: string;
    onChange: (val: string) => void;
    options: { id: string; name: string }[];
}> = ({ label, value, onChange, options }) => {
    const isKnownOption = useMemo(() => {
        return options.some(opt => opt.id === value);
    }, [value, options]);

    const showInput = !isKnownOption && value !== '';

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <label className="block text-sm font-bold text-indigo-300 mb-2">{label}</label>
            <select
                value={isKnownOption ? value : 'custom_option'}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom_option') {
                        onChange(''); 
                    } else {
                        onChange(val);
                    }
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white mb-2"
            >
                {options.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                <option value="custom_option">Khác (Tự nhập Model ID)</option>
            </select>

            {/* Always show input if custom is selected or if value is unknown */}
            {(!isKnownOption || value === '') && (
                <div className="animate-fade-in-up">
                    <input
                        type="text"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-500 rounded p-2 text-white font-mono text-sm focus:ring-1 focus:ring-indigo-500"
                        placeholder="Nhập Model ID..."
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
};

export const ApiSettings: React.FC = () => {
    const { showToast } = useToast();

    // Global Connection State
    const [connection, setConnection] = useState<GlobalConnectionSettings>(getConnectionSettings());
    
    // Gemini Settings
    const [useDefaultKey, setUseDefaultKey] = useState(true);
    const [geminiApiKeys, setGeminiApiKeys] = useState('');
    
    // OpenRouter Settings
    const [openRouterApiKey, setOpenRouterApiKey] = useState('');
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
    const [isFetchingORModels, setIsFetchingORModels] = useState(false);
    const [orModelError, setOrModelError] = useState<string | null>(null);
    const [showFreeOR, setShowFreeOR] = useState(false);

    // Proxy Settings
    const [proxyUrl, setProxyUrl] = useState('');
    const [proxyPassword, setProxyPassword] = useState('');
    const [proxyLegacyMode, setProxyLegacyMode] = useState(true);
    const [proxyForTools, setProxyForTools] = useState(false);
    const [isPingingProxy, setIsPingingProxy] = useState(false);
    const [proxyPingStatus, setProxyPingStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [proxyErrorMessage, setProxyErrorMessage] = useState('');
    const [proxyModelList, setProxyModelList] = useState<StoredProxyModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Proxy Profile State
    const [profiles, setProfiles] = useState<ProxyProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [isValidatingOR, setIsValidatingOR] = useState(false);
    const [orValidationStatus, setOrValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Fetch Gemini Models dynamically
    const { models: geminiModels } = useGeminiModels(MODEL_OPTIONS);

    // Load Initial Data
    useEffect(() => {
        const apiSettings = getApiSettings();
        setUseDefaultKey(apiSettings.useDefault);
        setGeminiApiKeys(apiSettings.keys.join('\n'));
        
        setOpenRouterApiKey(getOpenRouterApiKey());
        
        setProxyUrl(getProxyUrl());
        setProxyPassword(getProxyPassword());
        setProxyLegacyMode(getProxyLegacyMode());
        setProxyForTools(getProxyForTools());
        setProxyModelList(getStoredProxyModels());
        
        setConnection(getConnectionSettings());
        setProfiles(getProxyProfiles());
    }, []);

    // Helper to update connection state
    const updateConnection = (key: keyof GlobalConnectionSettings, value: any) => {
        setConnection(prev => ({ ...prev, [key]: value }));
    };

    // Save All Logic
    const handleSave = () => {
        try {
            // 1. Save Global Connection
            saveConnectionSettings(connection);

            // 2. Save Gemini Keys
            const keys = geminiApiKeys.split('\n').map(k => k.trim()).filter(Boolean);
            saveApiSettings({ useDefault: useDefaultKey, keys });

            // 3. Save OpenRouter
            saveOpenRouterApiKey(openRouterApiKey);

            // 4. Save Proxy
            saveProxyUrl(proxyUrl);
            saveProxyPassword(proxyPassword);
            saveProxyLegacyMode(proxyLegacyMode);
            saveProxyForTools(proxyForTools);
            saveStoredProxyModels(proxyModelList); // Save loaded models

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // OpenRouter Logic
    const handleValidateORKey = async () => {
        if (!openRouterApiKey) return;
        setIsValidatingOR(true);
        setOrValidationStatus('idle');
        try {
            await validateOpenRouterKey(openRouterApiKey);
            setOrValidationStatus('success');
            // Auto fetch models on success
            if (openRouterModels.length === 0) fetchOpenRouterModels();
        } catch (error) {
            setOrValidationStatus('error');
        } finally {
            setIsValidatingOR(false);
        }
    };

    const fetchOpenRouterModels = async () => {
        setIsFetchingORModels(true);
        setOrModelError(null);
        try {
            const models = await getOpenRouterModels();
            setOpenRouterModels(models);
        } catch (e) {
            setOrModelError(e instanceof Error ? e.message : 'Error loading models');
        } finally {
            setIsFetchingORModels(false);
        }
    };

    const filteredORModels = useMemo(() => {
        if (!showFreeOR) return openRouterModels;
        return openRouterModels.filter(m => m.pricing.prompt === '0' && m.pricing.completion === '0');
    }, [openRouterModels, showFreeOR]);

    // Proxy Ping Logic
    const handlePingProxy = async () => {
        if (!proxyUrl) return;
        setIsPingingProxy(true);
        setProxyPingStatus('idle');
        setProxyErrorMessage('');
        
        try {
            const cleanUrl = proxyUrl.trim().replace(/\/$/, '');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); 
            
            const reqOptions: RequestInit = {
                method: 'GET',
                signal: controller.signal,
            };

            // Basic headers
            const headers: Record<string, string> = {};
            if (!proxyLegacyMode) {
                headers['Content-Type'] = 'application/json';
                if (proxyPassword) {
                    headers['Authorization'] = `Bearer ${proxyPassword}`;
                }
            }
            reqOptions.headers = headers;
            if (proxyLegacyMode) reqOptions.mode = 'no-cors';

            // Try pinging a standard endpoint
            await fetch(`${cleanUrl}/v1/models`, reqOptions);
            
            clearTimeout(timeoutId);
            setProxyPingStatus('success');
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setProxyErrorMessage("Timeout.");
            } else if (error.message.includes('Failed to fetch')) {
                setProxyErrorMessage("Lỗi kết nối / CORS.");
            } else {
                setProxyErrorMessage(error.message);
            }
            setProxyPingStatus('error');
        } finally {
            setIsPingingProxy(false);
        }
    };

    // Load Models from Proxy
    const handleLoadProxyModels = async () => {
        if (!proxyUrl) {
            showToast("Vui lòng nhập Proxy URL.", "warning");
            return;
        }
        
        setIsLoadingModels(true);
        try {
            const models = await fetchProxyModels(proxyUrl, proxyPassword, proxyLegacyMode);
            setProxyModelList(models);
            saveStoredProxyModels(models); // Auto save
            showToast(`Đã tải ${models.length} models từ Proxy.`, "success");
        } catch (e: any) {
            console.error(e);
            showToast(`Lỗi tải models: ${e.message}`, "error");
        } finally {
            setIsLoadingModels(false);
        }
    };

    // --- PROXY PROFILE LOGIC ---

    const handleProfileChange = async (profileId: string) => {
        setActiveProfileId(profileId);
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            // Apply settings to UI state
            setProxyUrl(profile.url);
            setProxyPassword(profile.password);
            setProxyLegacyMode(profile.legacyMode);
            setProxyForTools(profile.proxyForTools);
            
            // Apply settings to Global Connection
            setConnection(prev => ({
                ...prev,
                proxy_protocol: profile.protocol,
                proxy_model: profile.chatModel,
                proxy_tool_model: profile.toolModel
            }));
            
            showToast(`Đã tải cấu hình: ${profile.name}`, 'info');

            // --- AUTO FETCH MODELS ---
            // Trigger fetch immediately using the profile data (not state, to avoid race condition)
            if (profile.url) {
                setIsLoadingModels(true);
                try {
                    const models = await fetchProxyModels(profile.url, profile.password, profile.legacyMode);
                    setProxyModelList(models);
                    saveStoredProxyModels(models);
                    // Optional: Notification for auto-fetch success
                    // showToast(`Đã cập nhật danh sách model (${models.length})`, 'success');
                } catch (e: any) {
                    console.error("Auto-fetch error:", e);
                    showToast(`Không thể tự động tải danh sách model: ${e.message}`, 'warning');
                } finally {
                    setIsLoadingModels(false);
                }
            }
        }
    };

    const handleSaveProfile = () => {
        if (!activeProfileId) {
            handleCreateProfile(); // Redirect to create new if no active profile
            return;
        }

        const updatedProfiles = profiles.map(p => {
            if (p.id === activeProfileId) {
                return {
                    ...p,
                    url: proxyUrl,
                    password: proxyPassword,
                    legacyMode: proxyLegacyMode,
                    proxyForTools: proxyForTools,
                    protocol: connection.proxy_protocol,
                    chatModel: connection.proxy_model,
                    toolModel: connection.proxy_tool_model
                };
            }
            return p;
        });

        setProfiles(updatedProfiles);
        saveProxyProfiles(updatedProfiles);
        showToast("Đã cập nhật cấu hình hiện tại.", 'success');
    };

    const handleCreateProfile = () => {
        const name = prompt("Nhập tên cho cấu hình mới:", "My Proxy Server");
        if (!name) return;

        const newProfile: ProxyProfile = {
            id: `profile_${Date.now()}`,
            name,
            url: proxyUrl,
            password: proxyPassword,
            legacyMode: proxyLegacyMode,
            proxyForTools: proxyForTools,
            protocol: connection.proxy_protocol,
            chatModel: connection.proxy_model,
            toolModel: connection.proxy_tool_model
        };

        const newProfiles = [...profiles, newProfile];
        setProfiles(newProfiles);
        saveProxyProfiles(newProfiles);
        setActiveProfileId(newProfile.id);
        showToast(`Đã tạo cấu hình mới: ${name}`, 'success');
    };

    const handleDeleteProfile = () => {
        if (!activeProfileId) return;
        if (!confirm("Bạn có chắc chắn muốn xóa cấu hình này không?")) return;

        const newProfiles = profiles.filter(p => p.id !== activeProfileId);
        setProfiles(newProfiles);
        saveProxyProfiles(newProfiles);
        setActiveProfileId('');
        showToast("Đã xóa cấu hình.", 'info');
    };

    const handleExportProfiles = () => {
        if (profiles.length === 0) {
            showToast("Không có cấu hình nào để xuất.", "warning");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `ProxyProfiles_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImportProfiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (Array.isArray(imported)) {
                    // Simple merge: append new ones
                    const merged = [...profiles, ...imported];
                    // Deduplicate by ID just in case, preferring new import? Or keep old?
                    // Let's just create new IDs for imported to be safe
                    const safeImported = imported.map((p: any) => ({
                        ...p,
                        id: `import_${Date.now()}_${Math.random().toString(36).substr(2,5)}`
                    }));
                    
                    const finalProfiles = [...profiles, ...safeImported];
                    setProfiles(finalProfiles);
                    saveProxyProfiles(finalProfiles);
                    showToast(`Đã nhập ${safeImported.length} cấu hình.`, 'success');
                } else {
                    showToast("File không hợp lệ.", "error");
                }
            } catch (err) {
                showToast("Lỗi nhập file JSON.", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    // --- RENDER ---

    const renderSourceTab = (source: CompletionSource, label: string) => (
        <button
            onClick={() => updateConnection('source', source)}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all border-2 ${
                connection.source === source
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
        >
            {label}
        </button>
    );

    // Determine which list to use: Fetched or Default
    const effectiveProxyModels = proxyModelList.length > 0 ? proxyModelList : [
        ...geminiModels,
        { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
        { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
        { id: 'gpt-4o', name: 'GPT-4o' }
    ];

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-3xl mx-auto space-y-8">
            {/* 1. SOURCE SELECTOR */}
            <div>
                <h3 className="text-xl font-bold text-sky-400 mb-4">1. Chọn Nguồn Kết Nối (API Source)</h3>
                <div className="flex gap-4 flex-col sm:flex-row">
                    {renderSourceTab('gemini', 'Google Gemini')}
                    {renderSourceTab('openrouter', 'OpenRouter')}
                    {renderSourceTab('proxy', 'Reverse Proxy')}
                </div>
            </div>

            <div className="border-t border-slate-700"></div>

            {/* 2. CONFIGURATION AREA */}
            <div>
                <h3 className="text-xl font-bold text-sky-400 mb-4">2. Cấu hình Chi tiết</h3>
                
                {/* GEMINI CONFIG */}
                {connection.source === 'gemini' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <label className="block text-sm font-bold text-indigo-300 mb-2">Mô hình Chính</label>
                            <SelectInput
                                value={connection.gemini_model}
                                onChange={(e) => updateConnection('gemini_model', e.target.value)}
                                options={geminiModels.map(m => ({ value: m.id, label: m.name }))}
                            />
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-300 mb-3">API Key (Gemini)</h4>
                            <div className="space-y-4 pl-2 border-l-2 border-slate-700">
                                <ToggleInput 
                                    label="Sử dụng API Key Mặc định (Environment)"
                                    checked={useDefaultKey}
                                    onChange={setUseDefaultKey}
                                />
                                {!useDefaultKey && (
                                    <textarea
                                        value={geminiApiKeys}
                                        onChange={e => setGeminiApiKeys(e.target.value)}
                                        rows={3}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 font-mono text-xs"
                                        placeholder="Nhập API Key cá nhân (Mỗi dòng 1 key)..."
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* OPENROUTER CONFIG */}
                {connection.source === 'openrouter' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <label className="block text-sm font-bold text-indigo-300 mb-2">Mô hình OpenRouter</label>
                            {isFetchingORModels ? <Loader message="Đang tải danh sách..." /> : (
                                <div className="flex gap-2">
                                    <div className="flex-grow">
                                        <SelectInput 
                                            options={filteredORModels.map(m => ({ value: m.id, label: `${m.name} (${m.pricing.prompt === '0' ? 'Free' : '$'})` }))}
                                            value={connection.openrouter_model}
                                            onChange={(e) => updateConnection('openrouter_model', e.target.value)}
                                            placeholder="Chọn mô hình..."
                                        />
                                    </div>
                                    <button 
                                        onClick={fetchOpenRouterModels} 
                                        className="px-3 bg-slate-700 rounded hover:bg-slate-600 text-slate-300" 
                                        title="Tải lại danh sách"
                                        aria-label="Tải lại danh sách mô hình"
                                    >
                                        ↻
                                    </button>
                                </div>
                            )}
                            <div className="mt-2">
                                <ToggleInput label="Chỉ hiện model miễn phí" checked={showFreeOR} onChange={setShowFreeOR} />
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-300 mb-3">API Key (OpenRouter)</h4>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={openRouterApiKey}
                                    onChange={e => setOpenRouterApiKey(e.target.value)}
                                    className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                                    placeholder="sk-or-..."
                                />
                                <button onClick={handleValidateORKey} disabled={isValidatingOR} className="px-4 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:bg-slate-600">
                                    {isValidatingOR ? '...' : 'Check'}
                                </button>
                            </div>
                            {orValidationStatus === 'success' && <p className="text-xs text-green-400 mt-1">Key hợp lệ.</p>}
                            {orValidationStatus === 'error' && <p className="text-xs text-red-400 mt-1">Key không hợp lệ.</p>}
                        </div>
                    </div>
                )}

                {/* PROXY CONFIG */}
                {connection.source === 'proxy' && (
                    <div className="space-y-6 animate-fade-in-up">
                        
                        {/* --- PROFILE MANAGER TOOLBAR --- */}
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Quản lý Cấu hình (Profile)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={handleImportProfiles}
                                    />
                                    <button onClick={() => fileInputRef.current?.click()} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300" title="Nhập Profile">Nhập</button>
                                    <button onClick={handleExportProfiles} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300" title="Xuất Profile">Xuất</button>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <select 
                                    value={activeProfileId} 
                                    onChange={(e) => handleProfileChange(e.target.value)}
                                    className="flex-grow bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white"
                                >
                                    <option value="">-- Chọn cấu hình --</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleSaveProfile} className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm font-bold" title="Lưu thay đổi vào Profile hiện tại">Lưu</button>
                                <button onClick={handleCreateProfile} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-bold" title="Tạo Profile mới từ cài đặt hiện tại">+</button>
                                <button onClick={handleDeleteProfile} disabled={!activeProfileId} className="px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded text-sm font-bold disabled:opacity-50" title="Xóa Profile">✕</button>
                            </div>
                        </div>
                        {/* ------------------------------- */}

                        <div className="space-y-4 border border-slate-700 p-4 rounded-lg bg-slate-900/30">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Proxy URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={proxyUrl}
                                        onChange={e => setProxyUrl(e.target.value)}
                                        className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white font-mono text-sm"
                                        placeholder="http://127.0.0.1:8889"
                                    />
                                    {/* Load Models Button */}
                                    <button 
                                        onClick={handleLoadProxyModels} 
                                        disabled={isLoadingModels} 
                                        className="px-3 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center justify-center"
                                        title="Tải danh sách Model từ Proxy"
                                    >
                                        {isLoadingModels ? (
                                            <Loader message="" /> 
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                    <button onClick={handlePingProxy} disabled={isPingingProxy} className="px-4 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:bg-slate-600">
                                        Ping
                                    </button>
                                </div>
                                {proxyPingStatus === 'success' && <p className="text-xs text-green-400 mt-1">Kết nối OK.</p>}
                                {proxyPingStatus === 'error' && <p className="text-xs text-red-400 mt-1">Lỗi: {proxyErrorMessage}</p>}
                            </div>

                            <LabeledInput 
                                label="Password / Key"
                                value={proxyPassword}
                                onChange={e => setProxyPassword(e.target.value)}
                                type="password"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <ToggleInput label="Legacy Mode" checked={proxyLegacyMode} onChange={setProxyLegacyMode} />
                                </div>
                                <div>
                                    <ToggleInput label="Proxy cho Tools" checked={proxyForTools} onChange={setProxyForTools} />
                                </div>
                            </div>
                        </div>

                        {/* Protocol Selection */}
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                            <label className="block text-sm font-bold text-sky-400 mb-3">Giao thức Proxy</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => updateConnection('proxy_protocol', 'openai')}
                                    className={`p-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors ${
                                        connection.proxy_protocol !== 'google_native' // Default/Fallback to OpenAI
                                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <span>🌐</span> Chuẩn OpenAI
                                </button>
                                <button
                                    onClick={() => updateConnection('proxy_protocol', 'google_native')}
                                    className={`p-3 rounded-lg border text-sm flex items-center justify-center gap-2 transition-colors ${
                                        connection.proxy_protocol === 'google_native'
                                        ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <span>⚡</span> Google Native
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Chat Model Selector */}
                            <ModelSelectorWithCustom
                                label="Chat Model ID"
                                value={connection.proxy_model}
                                onChange={(val) => updateConnection('proxy_model', val)}
                                options={effectiveProxyModels}
                            />

                            {/* Tool Model Selector */}
                            <ModelSelectorWithCustom
                                label="Tool Model ID"
                                value={connection.proxy_tool_model}
                                onChange={(val) => updateConnection('proxy_tool_model', val)}
                                options={effectiveProxyModels}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-700 sticky bottom-0 bg-slate-800/90 p-2 backdrop-blur-sm rounded-b-xl">
                {saveStatus === 'saved' && <span className="text-sm text-green-400 font-bold animate-pulse">Đã lưu!</span>}
                {saveStatus === 'error' && <span className="text-sm text-red-400 font-bold">Lỗi khi lưu!</span>}
                <button
                    onClick={handleSave}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-lg transition-transform active:scale-95 shadow-lg shadow-sky-900/30"
                >
                    Áp Dụng
                </button>
            </div>
        </div>
    );
};
