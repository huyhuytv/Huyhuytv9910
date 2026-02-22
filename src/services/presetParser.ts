
import type { SillyTavernPreset, PromptEntry } from '../types';
import defaultPreset from '../data/defaultPreset';

/**
 * Parses a SillyTavern preset file (.json).
 * "Forgiving Mode": Merges any valid JSON keys into the default preset.
 * @param file The preset file to parse.
 * @returns A promise that resolves to a SillyTavernPreset object.
 */
export const parsePresetFile = async (file: File): Promise<SillyTavernPreset> => {
    // Relaxed file extension check
    if (!file.name.toLowerCase().endsWith('.json')) {
        console.warn('Preset parser: File does not end with .json, attempting to parse anyway.');
    }

    try {
        const text = await file.text();
        let rawData: any;

        try {
            rawData = JSON.parse(text);
        } catch (e) {
             throw new Error('Tệp không phải là JSON hợp lệ.');
        }

        if (typeof rawData !== 'object' || rawData === null) {
             // If top level isn't object, maybe it's an array of settings? Just return default.
             console.warn("Preset JSON is not an object, using defaults.");
             return { ...defaultPreset, name: file.name };
        }
        
        // --- COMPATIBILITY MAPPINGS ---
        // Map legacy or alternative keys to our internal standard
        if (rawData.temperature !== undefined && rawData.temp === undefined) {
            rawData.temp = rawData.temperature;
        }
        if (rawData.openai_max_tokens !== undefined && rawData.max_tokens === undefined) {
            rawData.max_tokens = rawData.openai_max_tokens;
        }
        if (rawData.openai_max_context !== undefined && rawData.truncation_length === undefined) {
            rawData.truncation_length = rawData.openai_max_context;
        }
        
        // Map V3 card logic (if someone uploads a character card as a preset by mistake)
        // We try to extract whatever settings we can.
        if (rawData.spec === 'chara_card_v3' || rawData.spec === 'chara_card_v2') {
             // It's a card, not a preset. But we can try to apply its "override" settings if present.
             // Usually cards don't hold preset data directly at root, but we apply what matches.
        }

        // --- DEEP MERGE STRATEGY ---
        // 1. Start with Default Preset (Safe Base)
        // 2. Overwrite with imported data (User Intent)
        // 3. Keep name from file if not in data
        
        const nameFromContent = rawData.name;
        const preset: SillyTavernPreset = { ...defaultPreset, ...rawData };

        if (!nameFromContent) {
            preset.name = file.name.replace(/\.json$/i, '');
        }

        // --- SANITIZE COMPLEX FIELDS ---

        // Ensure 'prompts' is an array of objects if it exists
        if (preset.prompts && !Array.isArray(preset.prompts)) {
             preset.prompts = []; 
        } else if (preset.prompts) {
            // Ensure each prompt has required fields
            preset.prompts = preset.prompts.map((p: any) => {
                if (typeof p !== 'object' || p === null) return null;
                return {
                    ...p,
                    // Ensure enabled is boolean (default to true for core prompts if missing is handled elsewhere, 
                    // but here we just ensure type safety)
                    enabled: typeof p.enabled === 'boolean' ? p.enabled : false, 
                    // Ensure injection_order is mapped if present, for sorting
                    injection_order: p.injection_order ?? undefined
                };
            }).filter(Boolean) as PromptEntry[];
        }

        return preset;
    } catch (error) {
        console.error("Preset parsing failed:", error);
        // In strict mode we threw error. In forgiving mode, we return default + error name.
        return {
            ...defaultPreset,
            name: `[Lỗi] ${file.name}`,
            comment: `Không thể đọc tệp này. Đã khôi phục về mặc định. Lỗi: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};
