
import { callGeminiDirect } from '../api/geminiApi';
import { callOpenAIProxyTask } from '../api/proxyApi';
import { getConnectionSettings, getProxyForTools } from '../settingsService';
import type { ChatMessage, Lorebook } from '../../types';
import { cleanMessageContent } from '../promptManager';
import { parseLooseJson } from '../../utils';

const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export async function summarizeHistory(historySlice: ChatMessage[], cardName: string, customPrompt?: string): Promise<string> {
    const historyText = historySlice.map(msg => `${msg.role === 'user' ? 'User' : cardName}: ${cleanMessageContent(msg.content)}`).join('\n');
    const prompt = customPrompt 
        ? customPrompt.replace('{{chat_history_slice}}', historyText)
        : `Tóm tắt ngắn gọn diễn biến chính của đoạn hội thoại sau:\n\n${historyText}`;

    let responseText = "";

    if (getProxyForTools()) {
        const conn = getConnectionSettings();
        // Ưu tiên dùng model Tool, nếu không có thì dùng model Chat, cuối cùng fallback về Flash
        const targetModel = conn.proxy_tool_model || conn.proxy_model || 'gemini-3-flash-preview';
        responseText = await callOpenAIProxyTask(prompt, targetModel, conn.proxy_protocol, safetySettings);
    } else {
        const response = await callGeminiDirect('gemini-3-flash-preview', prompt, { temp: 0.3 } as any, safetySettings);
        responseText = response.text || "";
    }

    return responseText.trim();
}

// Fix: Updated signature to handle extra context from ChatModals
export async function generateLorebookEntry(
    keyword: string, 
    history: ChatMessage[], 
    longTermSummaries: string[], 
    lorebooks: Lorebook[]
): Promise<string> {
    const cardName = lorebooks.length > 0 ? lorebooks[0].name : "Character";
    const prompt = `Dựa trên lịch sử hội thoại, hãy viết một mục từ điển (Lorebook) chi tiết cho từ khóa "${keyword}".\n\nNhân vật: ${cardName}`;
    
    let responseText = "";

    if (getProxyForTools()) {
        const conn = getConnectionSettings();
        // Tạo nội dung cần model thông minh hơn một chút
        const targetModel = conn.proxy_model || conn.proxy_tool_model || 'gemini-3-pro-preview';
        responseText = await callOpenAIProxyTask(prompt, targetModel, conn.proxy_protocol, safetySettings);
    } else {
        const response = await callGeminiDirect('gemini-3-pro-preview', prompt, { temp: 0.7 } as any, safetySettings);
        responseText = response.text || "";
    }

    return responseText.trim();
}

// Fix: Updated signature to match hook usage in useWorldSystem
export async function scanWorldInfoWithAI(
    history: string,
    context: string,
    candidates: string,
    input: string,
    state: string,
    model: string,
    systemPrompt?: string
): Promise<{ selectedIds: string[], outgoingPrompt: string, rawResponse: string }> {
    const prompt = (systemPrompt || `Nhiệm vụ: Chọn các ID mục World Info cần thiết cho tình huống này.\nTrạng thái: {{state}}\nInput: {{input}}\nỨng viên: {{candidates}}\n\nTrả về mảng JSON ["id1", "id2"]`)
        .replace('{{history}}', history)
        .replace('{{context}}', context)
        .replace('{{candidates}}', candidates)
        .replace('{{input}}', input)
        .replace('{{state}}', state);

    let rawResponse = "";

    if (getProxyForTools()) {
        const conn = getConnectionSettings();
        // Smart Scan cần tốc độ, ưu tiên tool model
        const targetModel = conn.proxy_tool_model || conn.proxy_model || model || 'gemini-3-flash-preview';
        rawResponse = await callOpenAIProxyTask(prompt, targetModel, conn.proxy_protocol, safetySettings);
    } else {
        const response = await callGeminiDirect(model || 'gemini-3-flash-preview', prompt, { temp: 0 } as any, safetySettings);
        rawResponse = response.text || '[]';
    }
    
    // --- BƯỚC LÀM SẠCH QUAN TRỌNG ---
    // Loại bỏ các thẻ markdown code block (```json ... ``` hoặc ``` ... ```)
    rawResponse = rawResponse.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

    let selectedIds: string[] = [];
    try {
        // Sử dụng parseLooseJson để linh hoạt hơn với lỗi cú pháp nhỏ
        const json = parseLooseJson(rawResponse);
        
        // Hỗ trợ cả định dạng mảng trực tiếp ["id"] hoặc object { selected_ids: ["id"] }
        selectedIds = Array.isArray(json) ? json : (json.selected_ids || []);
    } catch (e) {
        console.warn("[Smart Scan] JSON Parse Failed. Trying regex fallback...", e);
        // Fallback: Nếu parse thất bại, cố gắng dùng Regex để tìm mảng JSON trong văn bản
        const arrayMatch = rawResponse.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
             try { 
                 const fallbackJson = parseLooseJson(arrayMatch[0]);
                 selectedIds = Array.isArray(fallbackJson) ? fallbackJson : [];
             } catch {}
        } else {
            selectedIds = [];
        }
    }

    // Đảm bảo luôn trả về mảng chuỗi
    if (!Array.isArray(selectedIds)) selectedIds = [];
    selectedIds = selectedIds.map(String);

    return { selectedIds, outgoingPrompt: prompt, rawResponse };
}
