
import { GenerateContentResponse } from "@google/genai";
import type { SillyTavernPreset } from '../types';
import { getConnectionSettings, getProxyUrl, getProxyPassword, getProxyLegacyMode } from './settingsService';
import { callGeminiDirect, getGeminiClient, buildGeminiPayload } from './api/geminiApi';
import { callOpenRouter } from './api/openRouterApi';
import { callProxy, callProxyStream } from './api/proxyApi';

const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

/**
 * Main Dispatcher: Điều hướng yêu cầu dựa trên Connection Settings
 */
export async function sendChatRequest(
    fullPrompt: string,
    settings: SillyTavernPreset,
    overrideModel?: string, // New Parameter
    overrideSource?: 'gemini' | 'openrouter' | 'proxy', // NEW: Override Source
    overrideConnection?: { url: string; password?: string; legacyMode?: boolean } // NEW: Override Connection
): Promise<{ response: GenerateContentResponse }> {
    const connection = getConnectionSettings();
    const source = overrideSource || connection.source;

    // Use override model if provided, else fall back to connection settings
    // Note: If overrideSource is provided, we expect overrideModel to be provided too, or we might fallback to wrong defaults.
    // But typically Arena provides both.
    const targetModel = overrideModel || (source === 'gemini' ? connection.gemini_model : (source === 'proxy' ? connection.proxy_model : connection.openrouter_model));

    if (source === 'proxy') {
        const text = await callProxy(targetModel, fullPrompt, settings, overrideConnection);
        return { response: { text } as GenerateContentResponse };
    }

    if (source === 'openrouter') {
        const text = await callOpenRouter(targetModel, fullPrompt, settings);
        return { response: { text } as GenerateContentResponse };
    }

    // Gemini Native
    const model = targetModel || 'gemini-3-pro-preview';
    const response = await callGeminiDirect(model, fullPrompt, settings, safetySettings);
    return { response };
}

/**
 * Unified Streaming Logic with Abort Signal Support
 */
export async function* sendChatRequestStream(
    fullPrompt: string,
    settings: SillyTavernPreset,
    signal?: AbortSignal, // NEW: Abort Signal
    overrideModel?: string, // NEW: Specific model for Arena mode or testing
    overrideSource?: 'gemini' | 'openrouter' | 'proxy', // NEW: Override Source
    overrideConnection?: { url: string; password?: string; legacyMode?: boolean } // NEW: Override Connection
): AsyncGenerator<string, void, unknown> {
    const connection = getConnectionSettings();
    const source = overrideSource || connection.source;
    
    // Determine Model ID: Override > Settings
    const targetModel = overrideModel || (source === 'gemini' ? connection.gemini_model : (source === 'proxy' ? connection.proxy_model : connection.openrouter_model));

    // 1. Handle Proxy Streaming
    if (source === 'proxy') {
        const stream = callProxyStream(targetModel, fullPrompt, settings, signal, overrideConnection);
        for await (const chunk of stream) {
            yield chunk;
        }
        return;
    }

    // 2. Handle OpenRouter (via fallback or specific implementation if added later)
    if (source === 'openrouter') {
        if (signal?.aborted) throw new Error("Aborted");
        // OpenRouter streaming not fully implemented in this simplified version, falling back to non-streaming or generic proxy logic if applicable.
        // But wait, callOpenRouter is non-streaming. 
        // If we want streaming for OpenRouter, we need callOpenRouterStream.
        // For now, let's assume non-streaming fallback or generic handling.
        // Actually, previous code had: if (source !== 'gemini') { ... }
        // Let's keep that structure but respect source.
        
        const result = await sendChatRequest(fullPrompt, settings, overrideModel, source);
        yield result.response.text || "";
        return;
    }

    // 3. Handle Gemini Native Streaming
    if (source === 'gemini') {
        const ai = getGeminiClient();
        const model = targetModel || 'gemini-3-pro-preview';
        const payload = buildGeminiPayload(fullPrompt, settings, safetySettings);

        try {
            const streamResponse = await ai.models.generateContentStream({
                model,
                contents: payload.contents,
                config: payload.config,
            });

            for await (const chunk of streamResponse) {
                if (signal?.aborted) {
                    break; 
                }
                yield chunk.text || "";
            }
        } catch (error) {
            if (signal?.aborted) {
                return;
            }
            console.error("Streaming Error:", error);
            throw new Error("Lỗi luồng dữ liệu AI.");
        }
    }
}

// Re-exporting OpenRouter members for UI
export { validateOpenRouterKey, getOpenRouterModels } from './api/openRouterApi';

// Re-export nghiệp vụ
export * from './ai/semanticTasks';
