import type { CharacterCard, SillyTavernPreset } from '../types';

/**
 * Merges settings from a character card into a base preset.
 * Settings present on the character card will override those in the preset.
 *
 * @param card The character card, which may contain override settings.
 * @param preset The base preset with default generation settings.
 * @returns A new SillyTavernPreset object with the merged settings.
 */
export const mergeSettings = (card: CharacterCard, preset: SillyTavernPreset): SillyTavernPreset => {
    // Create a deep copy to avoid mutating the original preset state
    const mergedSettings = JSON.parse(JSON.stringify(preset));

    // Define a map of possible keys in the card and their corresponding key in the preset
    const keyMap: { [key: string]: keyof SillyTavernPreset } = {
        temperature: 'temp',
        temp: 'temp',
        top_p: 'top_p',
        top_k: 'top_k',
        typical_p: 'typical_p',
        repetition_penalty: 'repetition_penalty',
        frequency_penalty: 'frequency_penalty',
        presence_penalty: 'presence_penalty',
        max_context: 'truncation_length', // Unofficial but common
        truncation_length: 'truncation_length',
        max_tokens: 'max_tokens',
    };

    for (const cardKey in keyMap) {
        if (card.hasOwnProperty(cardKey) && card[cardKey] !== undefined && card[cardKey] !== null) {
            const presetKey = keyMap[cardKey];
            if (presetKey) {
                mergedSettings[presetKey] = card[cardKey];
            }
        }
    }
    
    return mergedSettings;
};