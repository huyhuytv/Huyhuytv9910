
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { getApiKey } from '../settingsService';
import type { SillyTavernPreset } from '../../types';
import { useChatStore } from '../../store/chatStore';

export const getGeminiClient = (): GoogleGenAI => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key không được định cấu hình. Vui lòng đặt nó trong Cài đặt API.");
    }
    return new GoogleGenAI({ apiKey });
};

export const buildGeminiPayload = (fullPrompt: string, settings: SillyTavernPreset, safetySettings: any[]) => {
    return {
        model: settings.model || 'gemini-3-pro-preview',
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: {
            safetySettings,
            temperature: Number(settings.temp) || 1,
            topP: Number(settings.top_p) || 0.95,
            topK: Number(settings.top_k) || 40,
            maxOutputTokens: Number(settings.max_tokens) || 4096,
            stopSequences: settings.stopping_strings,
            thinkingConfig: (settings.thinking_budget && Number(settings.thinking_budget) > 0) 
                ? { thinkingBudget: Number(settings.thinking_budget) } 
                : undefined
        }
    };
};

export const callGeminiDirect = async (
    model: string, 
    prompt: string, 
    settings: SillyTavernPreset,
    safetySettings: any[] = []
): Promise<GenerateContentResponse> => {
    const ai = getGeminiClient();
    const payload = buildGeminiPayload(prompt, settings, safetySettings);

    // --- NETWORK LOGGING (SIMULATED) ---
    // Because SDK hides the fetch, we simulate the CURL command for debugging visibility.
    const apiKey = getApiKey();
    const modelId = model || payload.model;
    const simulatedEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING'}`;
    
    useChatStore.getState().addNetworkLog({
        id: `gemini-${Date.now()}`,
        timestamp: Date.now(),
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            contents: payload.contents,
            generationConfig: payload.config
        },
        source: 'gemini'
    });
    // -----------------------------------

    try {
        const response = await ai.models.generateContent({
            model: model || payload.model,
            contents: payload.contents,
            config: payload.config
        });
        return response;
    } catch (error) {
        console.error("Gemini Direct API error:", error);
        throw error;
    }
};
