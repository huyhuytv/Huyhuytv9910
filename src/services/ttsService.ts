
import { GoogleGenAI, Modality } from "@google/genai";
import { getApiKey } from './settingsService';

// Audio Context Singleton
let audioContext: AudioContext | null = null;

const getAudioContext = async () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    return audioContext;
};

// Decode Base64 function
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Convert Raw PCM (Int16 Little Endian) to AudioBuffer (Float32)
// Gemini 2.5 Flash TTS usually returns 24kHz, 1 channel, 16-bit PCM
function pcmToAudioBuffer(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000
): AudioBuffer {
    const numChannels = 1;
    // Each sample is 2 bytes (16-bit)
    const frameCount = data.length / 2;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Create a DataView to properly handle Little Endian reading
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let i = 0; i < frameCount; i++) {
        // Read Int16 at offset i*2, true = Little Endian
        const int16 = dataView.getInt16(i * 2, true);
        // Normalize to Float32 range [-1.0, 1.0]
        channelData[i] = int16 / 32768.0;
    }
    
    return buffer;
}

// [PHƯƠNG ÁN 1] Cấu hình Safety tối ưu: Thêm Civic Integrity và đảm bảo tất cả đều là BLOCK_NONE
const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

// [PHƯƠNG ÁN 2] Hàm vệ sinh văn bản nâng cao
export const sanitizeTextForSpeech = (text: string): string => {
    return text
        // 1. Loại bỏ các khối suy nghĩ <thinking>...</thinking>
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
        // 2. Loại bỏ tất cả thẻ HTML/XML
        .replace(/<[^>]+>/g, '')
        // 3. Loại bỏ các chỉ dẫn hành động trong ngoặc vuông [] hoặc tròn () thường chứa từ ngữ bạo lực
        // Ví dụ: [đấm vào mặt], (cười nham hiểm)
        .replace(/\[.*?\]/g, ' ')
        .replace(/\(.*?\)/g, ' ')
        // 4. Loại bỏ các ký tự Markdown định dạng (đậm, nghiêng) có thể làm rối AI
        .replace(/[\*\_~`]/g, '') 
        // 5. Chuẩn hóa khoảng trắng thừa
        .replace(/\s+/g, ' ')
        .trim();
};

// NEW: Hàm chỉ lấy Buffer (để dùng trong Queue)
export const fetchTtsBuffer = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key chưa được cấu hình.");

    const cleanText = sanitizeTextForSpeech(text);
    if (!cleanText) throw new Error("Không có nội dung văn bản hợp lệ.");

    const ai = new GoogleGenAI({ apiKey });
    const ctx = await getAudioContext();

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: cleanText }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
            safetySettings: safetySettings,
        },
    });

    const candidate = response.candidates?.[0];
    const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error("API không trả về dữ liệu âm thanh.");
    }

    const audioBytes = decode(base64Audio);
    
    try {
        const bufferCopy = audioBytes.buffer.slice(0);
        return await ctx.decodeAudioData(bufferCopy);
    } catch (stdErr) {
        try {
            return pcmToAudioBuffer(audioBytes, ctx, 24000);
        } catch (pcmErr) {
            throw new Error("Không thể giải mã dữ liệu âm thanh.");
        }
    }
};

// --- NATIVE TTS UTILS ---

export const getVietnameseVoices = (): SpeechSynthesisVoice[] => {
    const voices = window.speechSynthesis.getVoices();
    // Filter strictly for Vietnamese
    return voices.filter(v => v.lang.includes('vi'));
};

export const playNativeTts = (
    text: string, 
    voiceUri: string,
    rate: number = 1,
    pitch: number = 1,
    onStart?: () => void,
    onEnd?: () => void
): void => {
    // Cancel any current speaking
    window.speechSynthesis.cancel();

    const cleanText = sanitizeTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === voiceUri);
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    } else {
        // Fallback: try to find any Vietnamese voice if specific one not found
        const fallback = voices.find(v => v.lang.includes('vi'));
        if (fallback) utterance.voice = fallback;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    if (onStart) utterance.onstart = onStart;
    
    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
        console.error("Native TTS Error:", e);
        if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
};


export const playTextToSpeech = async (
    text: string, 
    voiceName: string = 'Kore',
    onPlayStart?: () => void
): Promise<void> => {
    
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key chưa được cấu hình.");

    // Áp dụng vệ sinh văn bản trước khi gửi
    const cleanText = sanitizeTextForSpeech(text);

    console.log('[TTS] Starting request...', { originalLength: text.length, cleanLength: cleanText.length, voiceName });

    if (!cleanText) {
        throw new Error("Không có nội dung văn bản hợp lệ để đọc (Văn bản có thể chỉ chứa ký tự đặc biệt).");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const ctx = await getAudioContext();
        console.log('[TTS] AudioContext ready/resumed');

        console.log('[TTS] Sending API request...');
        
        // Direct await without Promise.race/timeout
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: cleanText }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
                safetySettings: safetySettings, // Áp dụng cấu hình Safety đã tối ưu
            },
        });

        console.log('[TTS] API Response received');

        const candidate = response.candidates?.[0];
        const base64Audio = candidate?.content?.parts?.[0]?.inlineData?.data;
        
        if (!base64Audio) {
            const finishReason = candidate?.finishReason;
            const safetyRatings = candidate?.safetyRatings;
            
            console.error('[TTS] No audio data.', { finishReason, safetyRatings });
            
            if (finishReason === 'SAFETY' || finishReason === 'OTHER') {
                throw new Error(`AI từ chối đọc do nội dung nhạy cảm. (Reason: ${finishReason})`);
            }
            throw new Error(`API trả về phản hồi rỗng. (Reason: ${finishReason || 'Unknown'})`);
        }

        const audioBytes = decode(base64Audio);
        console.log(`[TTS] Decoded ${audioBytes.length} bytes.`);

        let audioBuffer: AudioBuffer;

        // STRATEGY: DUAL DECODE
        // Try Standard Decode (WAV/MP3) first. If it fails, assume Raw PCM.
        try {
            // Clone buffer because decodeAudioData detaches it
            const bufferCopy = audioBytes.buffer.slice(0);
            audioBuffer = await ctx.decodeAudioData(bufferCopy);
            console.log('[TTS] Standard decodeAudioData success.');
        } catch (stdErr) {
            console.warn('[TTS] Standard decode failed, trying Raw PCM fallback...', stdErr);
            try {
                audioBuffer = pcmToAudioBuffer(audioBytes, ctx, 24000);
                console.log('[TTS] Raw PCM decode success.');
            } catch (pcmErr) {
                console.error('[TTS] All decoding attempts failed.', pcmErr);
                throw new Error("Không thể giải mã dữ liệu âm thanh (Định dạng không hỗ trợ).");
            }
        }

        return new Promise((resolve, reject) => {
            try {
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.onended = () => {
                    console.log('[TTS] Playback ended.');
                    resolve();
                };
                
                // Notify UI that playback is starting (loading finished)
                if (onPlayStart) onPlayStart();
                
                source.start();
                console.log('[TTS] Playback started.');
            } catch (e) {
                reject(e);
            }
        });

    } catch (error) {
        console.error("[TTS] Critical Error:", error);
        throw error;
    }
};

export const AVAILABLE_VOICES = [
    { id: 'Puck', name: 'Puck (Nam, Trầm, Kể chuyện)' },
    { id: 'Charon', name: 'Charon (Nam, Sâu, Uy quyền)' },
    { id: 'Kore', name: 'Kore (Nữ, Dịu, Thư giãn)' },
    { id: 'Fenrir', name: 'Fenrir (Nam, Mạnh, Sôi nổi)' },
    { id: 'Zephyr', name: 'Zephyr (Nữ, Cao, Tự tin)' },
];