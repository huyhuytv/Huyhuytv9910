
import React, { useState, useEffect } from 'react';
// import type { SillyTavernPreset } from '../types'; // Removed
import { SliderInput } from './ui/SliderInput';
import { SelectInput } from './ui/SelectInput';
import { LabeledTextarea } from './ui/LabeledTextarea';
import { getGlobalContextSettings, saveGlobalContextSettings, DEFAULT_GLOBAL_CONTEXT_SETTINGS, GlobalContextSettings } from '../services/settingsService';
import { useToast } from './ToastSystem';

// Removed Props interface for Preset
interface SmartContextSettingsProps {
    // No props needed now, it's global
}

export const SmartContextSettings: React.FC<SmartContextSettingsProps> = () => {
    const { showToast } = useToast();
    const [globalSettings, setGlobalSettings] = useState<GlobalContextSettings>(DEFAULT_GLOBAL_CONTEXT_SETTINGS);

    // Load global settings on mount
    useEffect(() => {
        setGlobalSettings(getGlobalContextSettings());
    }, []);

    const handleGlobalUpdate = (key: keyof GlobalContextSettings, value: any) => {
        const newSettings = { ...globalSettings, [key]: value };
        setGlobalSettings(newSettings);
        saveGlobalContextSettings(newSettings);
    };
    
    const resetPromptToDefault = () => {
        if (window.confirm("Bạn có chắc muốn khôi phục Lời nhắc Tóm tắt về mặc định không?")) {
            handleGlobalUpdate('summarization_prompt', DEFAULT_GLOBAL_CONTEXT_SETTINGS.summarization_prompt);
            showToast("Đã khôi phục lời nhắc tóm tắt.", 'success');
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-bold text-sky-400 mb-4">Smart Context & Memory (Toàn Cục)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <SliderInput
                        label="Ngưỡng Kích Hoạt Tóm Tắt (Context Depth)"
                        value={globalSettings.context_depth || 20}
                        onChange={(v) => handleGlobalUpdate('context_depth', v)}
                        min={4}
                        max={100}
                        step={2}
                    />

                    <SliderInput
                        label="Kích Thước Gói Tóm Tắt (Chunk Size)"
                        value={globalSettings.summarization_chunk_size || 10}
                        onChange={(v) => handleGlobalUpdate('summarization_chunk_size', v)}
                        min={1}
                        max={globalSettings.context_depth || 20}
                        step={1}
                    />

                    <SelectInput 
                        label="Chế độ Ghép nối Lịch sử"
                        value={globalSettings.context_mode || 'standard'}
                        onChange={(e) => handleGlobalUpdate('context_mode', e.target.value)}
                        options={[
                            { value: 'standard', label: 'Tiêu chuẩn (Cả User & AI)' },
                            { value: 'ai_only', label: 'Chế độ Tự thuật (Chỉ AI)' }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                         <label className="block text-sm font-medium text-slate-300">Lời nhắc Tóm tắt Toàn cục (Global)</label>
                         <button onClick={resetPromptToDefault} className="text-xs text-red-400 hover:text-red-300 hover:underline">
                             Khôi phục Mặc định
                         </button>
                    </div>
                    <p className="text-xs text-slate-500 italic mb-2">
                        Lời nhắc này áp dụng cho mọi Preset. Sử dụng <code>{'{{recent_summaries}}'}</code> để chèn bối cảnh lịch sử.
                    </p>
                    <LabeledTextarea 
                        label=""
                        value={globalSettings.summarization_prompt || ''}
                        onChange={(e) => handleGlobalUpdate('summarization_prompt', e.target.value)}
                        rows={15}
                        className="font-mono text-xs"
                    />
                </div>
            </div>
        </div>
    );
};
