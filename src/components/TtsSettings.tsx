
import React, { useState, useEffect } from 'react';
import { AVAILABLE_VOICES, playTextToSpeech, playNativeTts, getVietnameseVoices } from '../services/ttsService';
import { useToast } from './ToastSystem';
import { ToggleInput } from './ui/ToggleInput';
import { SelectInput } from './ui/SelectInput';
import { SliderInput } from './ui/SliderInput';
import { useTTS } from '../contexts/TTSContext';
import { GlobalTTSSettings } from '../services/settingsService';

export const TtsSettings: React.FC = () => {
    const { settings, updateSettings } = useTTS();
    const { showToast } = useToast();
    const [isTesting, setIsTesting] = useState(false);
    const [nativeVoices, setNativeVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    // Load native voices on mount
    useEffect(() => {
        const loadVoices = () => {
            const voices = getVietnameseVoices();
            setNativeVoices(voices);
        };
        
        loadVoices();
        
        // Browsers load voices asynchronously
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const handleUpdate = (key: keyof GlobalTTSSettings, value: any) => {
        updateSettings({ ...settings, [key]: value });
    };

    const handleTestVoice = async () => {
        if (isTesting) return;
        setIsTesting(true);
        try {
            const text = "Xin chào, đây là giọng đọc thử nghiệm. Hệ thống âm thanh đang hoạt động tốt.";
            const provider = settings.tts_provider || 'gemini';

            if (provider === 'gemini') {
                const voice = settings.tts_voice || 'Kore';
                await playTextToSpeech(text, voice);
            } else {
                const voiceUri = settings.tts_native_voice || '';
                const rate = settings.tts_rate || 1;
                const pitch = settings.tts_pitch || 1;
                
                // Wrap native play in promise for test button state logic
                await new Promise<void>((resolve) => {
                    playNativeTts(text, voiceUri, rate, pitch, undefined, () => resolve());
                });
            }
            showToast("Đã phát âm thanh thử nghiệm thành công.", "success");
        } catch (e) {
            showToast(`Lỗi thử nghiệm: ${e instanceof Error ? e.message : String(e)}`, "error");
        } finally {
            setIsTesting(false);
        }
    };

    const isNative = settings.tts_provider === 'native';

    return (
        <div className="space-y-6">
            <ToggleInput 
                label="Bật Text-to-Speech (TTS) Toàn Cục"
                checked={settings.tts_enabled ?? false}
                onChange={(v) => handleUpdate('tts_enabled', v)}
            />

            <div className={`space-y-6 transition-opacity duration-300 ${!settings.tts_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                <ToggleInput
                    label="Chế độ Đọc Streaming (Real-time)"
                    checked={settings.tts_streaming ?? false}
                    onChange={(v) => handleUpdate('tts_streaming', v)}
                />

                <SelectInput 
                    label="Nguồn Giọng Đọc (Provider)"
                    value={settings.tts_provider || 'gemini'}
                    onChange={(e) => handleUpdate('tts_provider', e.target.value)}
                    options={[
                        { value: 'gemini', label: 'Gemini AI (Cloud)' },
                        { value: 'native', label: 'Trình duyệt (Native)' }
                    ]}
                />

                {isNative ? (
                    <div className="space-y-4 border-l-2 border-slate-600 pl-4">
                        {nativeVoices.length === 0 ? (
                            <p className="text-xs text-amber-400">Không tìm thấy giọng Tiếng Việt trong trình duyệt.</p>
                        ) : (
                            <SelectInput 
                                label="Giọng Đọc Trình Duyệt"
                                value={settings.tts_native_voice || (nativeVoices[0]?.voiceURI || '')}
                                onChange={(e) => handleUpdate('tts_native_voice', e.target.value)}
                                options={nativeVoices.map(v => ({ value: v.voiceURI, label: v.name }))}
                            />
                        )}
                        <SliderInput 
                            label="Tốc độ (Rate)"
                            value={settings.tts_rate ?? 1}
                            onChange={(v) => handleUpdate('tts_rate', v)}
                            min={0.1} max={2} step={0.1}
                        />
                        <SliderInput 
                            label="Cao độ (Pitch)"
                            value={settings.tts_pitch ?? 1}
                            onChange={(v) => handleUpdate('tts_pitch', v)}
                            min={0} max={2} step={0.1}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 border-l-2 border-slate-600 pl-4">
                        <SelectInput 
                            label="Giọng đọc Gemini"
                            value={settings.tts_voice || 'Kore'}
                            onChange={(e) => handleUpdate('tts_voice', e.target.value)}
                            options={AVAILABLE_VOICES.map(v => ({ value: v.id, label: v.name }))}
                        />
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleTestVoice}
                        disabled={isTesting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isTesting ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang tải...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                <span>Nghe thử</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
