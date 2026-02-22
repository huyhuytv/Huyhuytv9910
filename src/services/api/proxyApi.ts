
import type { SillyTavernPreset } from '../../types';
import { getProxyUrl, getProxyPassword, getProxyLegacyMode } from '../settingsService';
import { useChatStore } from '../../store/chatStore';

export const callProxy = async (
    model: string,
    prompt: string,
    settings: SillyTavernPreset
): Promise<string> => {
    const proxyUrl = getProxyUrl();
    const proxyPassword = getProxyPassword();
    const isLegacyMode = getProxyLegacyMode();
    const cleanUrl = proxyUrl.trim().replace(/\/$/, '');

    const payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(settings.temp) || 1,
        max_tokens: Number(settings.max_tokens) || 4096,
        stream: false
    };

    const headers: Record<string, string> = {};
    if (isLegacyMode) {
        headers['Content-Type'] = 'text/plain';
    } else {
        headers['Content-Type'] = 'application/json';
        if (proxyPassword) headers['Authorization'] = `Bearer ${proxyPassword}`;
    }

    const endpoint = `${cleanUrl}/v1/chat/completions`;

    // --- NETWORK LOGGING ---
    useChatStore.getState().addNetworkLog({
        id: `proxy-${Date.now()}`,
        timestamp: Date.now(),
        url: endpoint,
        method: 'POST',
        headers: headers,
        body: payload,
        source: 'proxy'
    });
    // -----------------------

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
};

// Fix: Added callOpenAIProxyTask for non-chat completions (e.g. translation, scanning)
// Update: Added maxTokens parameter to prevent truncation
export const callOpenAIProxyTask = async (
    prompt: string,
    model: string,
    protocol: string,
    safetySettings: any[],
    maxTokens: number = 16384 // Default safe value increased
): Promise<string> => {
    const proxyUrl = getProxyUrl();
    const proxyPassword = getProxyPassword();
    const isLegacyMode = getProxyLegacyMode();
    const cleanUrl = proxyUrl.trim().replace(/\/$/, '');

    const payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: maxTokens, // Use the dynamic value
        stream: false
    };

    const headers: Record<string, string> = {};
    if (isLegacyMode) {
        headers['Content-Type'] = 'text/plain';
    } else {
        headers['Content-Type'] = 'application/json';
        if (proxyPassword) headers['Authorization'] = `Bearer ${proxyPassword}`;
    }

    const endpoint = `${cleanUrl}/v1/chat/completions`;

    // --- NETWORK LOGGING ---
    useChatStore.getState().addNetworkLog({
        id: `proxy-task-${Date.now()}`,
        timestamp: Date.now(),
        url: endpoint,
        method: 'POST',
        headers: headers,
        body: payload,
        source: 'proxy'
    });
    // -----------------------

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Proxy Task Error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
};

/**
 * Handles Streaming response from Proxy (OpenAI Format SSE)
 */
export async function* callProxyStream(
    model: string,
    prompt: string,
    settings: SillyTavernPreset,
    signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
    const proxyUrl = getProxyUrl();
    const proxyPassword = getProxyPassword();
    const isLegacyMode = getProxyLegacyMode();
    const cleanUrl = proxyUrl.trim().replace(/\/$/, '');

    const payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number(settings.temp) || 1,
        max_tokens: Number(settings.max_tokens) || 4096,
        stream: true // ENABLE STREAMING
    };

    const headers: Record<string, string> = {};
    if (isLegacyMode) {
        headers['Content-Type'] = 'text/plain';
    } else {
        headers['Content-Type'] = 'application/json';
        if (proxyPassword) headers['Authorization'] = `Bearer ${proxyPassword}`;
    }

    const endpoint = `${cleanUrl}/v1/chat/completions`;

    // --- NETWORK LOGGING ---
    useChatStore.getState().addNetworkLog({
        id: `proxy-stream-${Date.now()}`,
        timestamp: Date.now(),
        url: endpoint,
        method: 'POST',
        headers: headers,
        body: payload,
        source: 'proxy'
    });
    // -----------------------

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
    });

    if (!response.ok) throw new Error(`Proxy Stream Error: ${response.status}`);
    if (!response.body) throw new Error("No response body received from Proxy");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                
                if (trimmed.startsWith("data: ")) {
                    try {
                        const jsonStr = trimmed.slice(6);
                        const json = JSON.parse(jsonStr);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
    } catch (e) {
        if (signal?.aborted) return;
        throw e;
    }
}

/**
 * Fetch list of models from Proxy
 */
export const fetchProxyModels = async (
    url: string,
    password?: string,
    isLegacyMode?: boolean
): Promise<{ id: string; name: string }[]> => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const endpoint = `${cleanUrl}/v1/models`;

    const headers: Record<string, string> = {};
    if (!isLegacyMode) {
        headers['Content-Type'] = 'application/json';
        if (password) headers['Authorization'] = `Bearer ${password}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle standard OpenAI response format: { object: 'list', data: [...] }
        const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        
        return list.map((m: any) => ({
            id: m.id,
            name: m.id // Use ID as name for simplicity, or m.object if needed
        })).sort((a: any, b: any) => a.id.localeCompare(b.id));

    } catch (e) {
        throw e;
    }
};
