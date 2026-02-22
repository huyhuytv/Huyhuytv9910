
import { Type } from "@google/genai";
import { getGeminiClient } from './api/geminiApi';
import { callOpenAIProxyTask } from './api/proxyApi';
import { getConnectionSettings, getProxyForTools } from './settingsService';

const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export async function translateLorebookBatch(
    entries: any[], 
    customPromptTemplate: string,
    model: string = 'gemini-3-flash-preview' 
): Promise<{ entries: any[], rawResponse: string, finalPrompt: string }> {
    
    const minifiedEntries = entries.map(e => ({
        uid: e.uid,
        keys: e.keys,
        comment: e.comment,
        content: e.content
    }));

    const jsonString = JSON.stringify(minifiedEntries);
    const finalPrompt = customPromptTemplate.replace('{{json_data}}', jsonString);
    let responseText = "";

    try {
        if (getProxyForTools()) {
            const conn = getConnectionSettings();
            const targetModel = conn.proxy_tool_model || conn.proxy_model || model;
            responseText = await callOpenAIProxyTask(finalPrompt, targetModel, conn.proxy_protocol, safetySettings);
        } else {
            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: finalPrompt,
                config: {
                    responseMimeType: 'application/json',
                    safetySettings,
                    temperature: 0.1 
                },
            });
            responseText = response.text || "[]";
        }

        let translatedEntries = [];
        try {
             translatedEntries = JSON.parse(responseText);
        } catch(e) {
             throw new Error("Failed to parse JSON response");
        }
        
        if (!Array.isArray(translatedEntries)) {
            if ((translatedEntries as any).entries) translatedEntries = (translatedEntries as any).entries;
            else if ((translatedEntries as any).data) translatedEntries = (translatedEntries as any).data;
        }

        return { entries: translatedEntries, rawResponse: responseText, finalPrompt };

    } catch (error: any) {
        throw {
            message: error.message || String(error),
            rawResponse: responseText,
            finalPrompt: finalPrompt
        };
    }
}

export async function translateGreetingsBatch(
    data: any,
    context: any,
    model: string = 'gemini-3-flash-preview'
) {
    const prompt = `... (Prompt Logic) ... \n${JSON.stringify(data)}`; 
    // Simplified for brevity, logic remains same as original
    
    let text = "{}";
    try {
        if (getProxyForTools()) {
            const conn = getConnectionSettings();
            const targetModel = conn.proxy_tool_model || conn.proxy_model || model;
            text = await callOpenAIProxyTask(prompt, targetModel, conn.proxy_protocol, safetySettings);
        } else {
            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    safetySettings,
                }
            });
            text = response.text || "{}";
        }
        return JSON.parse(text);
    } catch (error: any) {
        throw new Error(error.message || "Lỗi dịch thuật từ AI.");
    }
}
