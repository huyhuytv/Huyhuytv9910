import { useState, useEffect } from 'react';
import { getApiKey } from '../services/settingsService';

export interface GeminiModel {
    id: string;
    name: string;
}

let cachedModels: GeminiModel[] | null = null;
let isFetching = false;
let fetchPromise: Promise<GeminiModel[]> | null = null;

export const fetchGeminiModels = async (): Promise<GeminiModel[]> => {
    if (cachedModels) return cachedModels;
    if (isFetching && fetchPromise) return fetchPromise;

    isFetching = true;
    fetchPromise = (async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            isFetching = false;
            return [];
        }
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }
            const data = await response.json();
            if (data && data.models) {
                const models = data.models
                    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                    .map((m: any) => ({
                        id: m.name.replace('models/', ''),
                        name: m.displayName || m.name.replace('models/', '')
                    }));
                cachedModels = models;
                return models;
            }
            return [];
        } catch (error) {
            console.error("Error fetching Gemini models:", error);
            return [];
        } finally {
            isFetching = false;
        }
    })();

    return fetchPromise;
};

export const useGeminiModels = (defaultOptions: GeminiModel[]) => {
    const [models, setModels] = useState<GeminiModel[]>(cachedModels || defaultOptions);
    const [isLoading, setIsLoading] = useState(!cachedModels);

    useEffect(() => {
        if (!cachedModels) {
            fetchGeminiModels().then(fetchedModels => {
                if (fetchedModels.length > 0) {
                    setModels(fetchedModels);
                }
                setIsLoading(false);
            });
        }
    }, []);

    return { models, isLoading };
};
