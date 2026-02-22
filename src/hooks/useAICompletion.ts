
import { useState, useCallback } from 'react';
import { GenerateContentResponse } from "@google/genai";
import { sendChatRequest, sendChatRequestStream } from '../services/geminiService';
import type { SillyTavernPreset } from '../types';

export const useAICompletion = () => {
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    /**
     * Sends a chat request to the configured AI provider.
     * Note: This function expects a fully constructed prompt string.
     */
    const generate = useCallback(async (
        fullPrompt: string,
        settings: SillyTavernPreset
    ): Promise<GenerateContentResponse | null> => {
        setIsGenerating(true);
        setError('');

        try {
            const result = await sendChatRequest(fullPrompt, settings);
            return result.response;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi gọi AI.';
            setError(msg);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    /**
     * Sends a chat request via Stream.
     * Yields chunks of text.
     */
    const generateStream = useCallback(async function* (
        fullPrompt: string,
        settings: SillyTavernPreset
    ): AsyncGenerator<string, void, unknown> {
        setIsGenerating(true);
        setError('');

        try {
            const stream = sendChatRequestStream(fullPrompt, settings);
            for await (const chunk of stream) {
                yield chunk;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi gọi AI Stream.';
            setError(msg);
            throw err; // Re-throw to handle in UI
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const clearError = useCallback(() => setError(''), []);

    return {
        generate,
        generateStream,
        isGenerating,
        error,
        clearError
    };
};