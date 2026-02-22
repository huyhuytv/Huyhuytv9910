
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { fetchTtsBuffer, playNativeTts } from '../services/ttsService';
import { useToast } from '../components/ToastSystem';
import { GlobalTTSSettings, getGlobalTTSSettings, saveGlobalTTSSettings } from '../services/settingsService';

// Options passed when queuing speech
interface TTSOptions {
    provider?: 'gemini' | 'native';
    rate?: number;
    pitch?: number;
}

interface QueueItem {
    id: string;
    text: string;
    voice: string;
    audioPromise?: Promise<AudioBuffer>;
    provider: 'gemini' | 'native';
    rate: number;
    pitch: number;
}

interface TTSContextType {
    isPlaying: boolean;
    isPaused: boolean;
    autoPlayEnabled: boolean;
    queue: QueueItem[];
    currentPlayingId: string | null;
    isLoading: boolean;
    
    // Settings State
    settings: GlobalTTSSettings;
    updateSettings: (newSettings: GlobalTTSSettings) => void;
    
    addToQueue: (text: string, voice: string, id?: string, options?: TTSOptions) => void;
    playImmediately: (text: string, voice: string, id?: string, options?: TTSOptions) => void;
    toggleAutoPlay: () => void;
    togglePause: () => void;
    skip: () => void;
    previous: () => void;
    stopAll: () => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- Global Settings State ---
    const [settings, setSettings] = useState<GlobalTTSSettings>(getGlobalTTSSettings());

    const updateSettings = useCallback((newSettings: GlobalTTSSettings) => {
        setSettings(newSettings);
        saveGlobalTTSSettings(newSettings);
    }, []);

    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
    const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const { showToast } = useToast();

    // Init Audio Context lazily
    const getContext = useCallback(async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    // Core Play Function (Buffer - Gemini)
    const playBuffer = useCallback(async (buffer: AudioBuffer, id: string) => {
        const ctx = await getContext();
        
        // Stop any existing source just in case
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            setIsPlaying(false);
            setCurrentPlayingId(null);
            activeSourceRef.current = null;
        };

        activeSourceRef.current = source;
        source.start();
        setIsPlaying(true);
        setCurrentPlayingId(id);
    }, [getContext]);

    // Process Queue Effect
    useEffect(() => {
        const processQueue = async () => {
            // Only process if not playing, not paused, not loading, and queue has items
            if (isPlaying || isPaused || isLoading || queue.length === 0) return;

            const nextItem = queue[0];
            setIsLoading(true); 

            try {
                if (nextItem.provider === 'native') {
                    // --- NATIVE HANDLING ---
                    setIsPlaying(true);
                    setCurrentPlayingId(nextItem.id);
                    setIsLoading(false); // Native loads instantly

                    playNativeTts(
                        nextItem.text, 
                        nextItem.voice, 
                        nextItem.rate, 
                        nextItem.pitch, 
                        () => {
                            // On Start
                        },
                        () => {
                            // On End
                            setIsPlaying(false);
                            setCurrentPlayingId(null);
                            // Only remove from queue after finishing
                            setQueue(prev => prev.slice(1));
                        }
                    );
                    // Return early so we don't execute buffer logic
                    return; 
                }

                // --- GEMINI HANDLING (Buffer) ---
                if (nextItem.audioPromise) {
                    const buffer = await nextItem.audioPromise;
                    
                    // Remove from queue ONLY after successful retrieval/wait (before playing starts)
                    setQueue(prev => prev.slice(1));
                    
                    // Play
                    await playBuffer(buffer, nextItem.id);
                }
            } catch (error) {
                console.error("TTS Queue Error:", error);
                // Nếu file này lỗi, báo lỗi và bỏ qua để sang file tiếp theo
                showToast(`Lỗi đọc: ${error instanceof Error ? error.message : String(error)}`, 'error');
                setQueue(prev => prev.slice(1));
            } finally {
                // For Native, isLoading is cleared inside the block. For Gemini, clear it here.
                if (nextItem.provider !== 'native') {
                    setIsLoading(false);
                }
            }
        };

        processQueue();
    }, [queue, isPlaying, isPaused, isLoading, playBuffer, showToast]);

    // Public Actions

    const addToQueue = useCallback((text: string, voice?: string, id: string = `msg-${Date.now()}`, options: TTSOptions = {}) => {
        // Fallback to Global Settings if not provided
        const provider = options.provider || settings.tts_provider;
        const voiceToUse = voice || (provider === 'native' ? settings.tts_native_voice : settings.tts_voice);
        const rate = options.rate !== undefined ? options.rate : settings.tts_rate;
        const pitch = options.pitch !== undefined ? options.pitch : settings.tts_pitch;
        
        let audioPromise: Promise<AudioBuffer> | undefined;

        // PRE-FETCHING: Gọi API ngay lập tức tại thời điểm thêm vào hàng đợi (chỉ với Gemini)
        if (provider === 'gemini') {
            audioPromise = fetchTtsBuffer(text, voiceToUse);
        }
        
        const newItem: QueueItem = { 
            id, 
            text, 
            voice: voiceToUse,
            audioPromise,
            provider,
            rate,
            pitch
        };
        
        setQueue(prev => [...prev, newItem]);
    }, [settings]);

    const playImmediately = useCallback(async (text: string, voice?: string, id: string = `now-${Date.now()}`, options: TTSOptions = {}) => {
        // 1. Clear Queue
        setQueue([]);
        
        // 2. Stop current audio (Buffer)
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
        }
        // 3. Stop current audio (Native)
        window.speechSynthesis.cancel();

        setIsPlaying(false);
        setIsPaused(false);
        
        // 4. Add to queue (it will be picked up immediately by the effect)
        // Note: voice and options will default inside addToQueue if undefined
        addToQueue(text, voice!, id, options);
    }, [addToQueue]);

    const togglePause = useCallback(async () => {
        const ctx = await getContext();
        
        if (isPaused) {
            // RESUME
            if (ctx.state === 'suspended') await ctx.resume();
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
            setIsPaused(false);
        } else {
            // PAUSE
            if (ctx.state === 'running') await ctx.suspend();
            if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
            setIsPaused(true);
        }
    }, [getContext, isPaused]);

    const skip = useCallback(() => {
        // Skip Native
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
        
        // Skip Buffer
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
        } else {
            // If loading
            if (isLoading && queue.length > 0) {
                 setQueue(prev => prev.slice(1));
                 setIsLoading(false);
            }
        }
    }, [isLoading, queue.length]);

    const previous = useCallback(async () => {
        console.log("Replay not fully supported in this version without buffer caching.");
    }, []);

    const stopAll = useCallback(() => {
        setQueue([]);
        window.speechSynthesis.cancel();
        if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
        }
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
    }, []);

    const toggleAutoPlay = useCallback(() => {
        setAutoPlayEnabled(prev => !prev);
    }, []);

    return (
        <TTSContext.Provider value={{
            isPlaying,
            isPaused,
            autoPlayEnabled,
            queue,
            currentPlayingId,
            isLoading,
            settings,
            updateSettings,
            addToQueue,
            playImmediately,
            toggleAutoPlay,
            togglePause,
            skip,
            previous,
            stopAll
        }}>
            {children}
        </TTSContext.Provider>
    );
};

export const useTTS = () => {
    const context = useContext(TTSContext);
    if (context === undefined) {
        throw new Error('useTTS must be used within a TTSProvider');
    }
    return context;
};
