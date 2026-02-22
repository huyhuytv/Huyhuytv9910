
import { useCallback, useState } from 'react';
import type { CharacterCard, WorldInfoEntry, WorldInfoRuntimeStats, SillyTavernPreset } from '../types';
import { performWorldInfoScan, prepareLorebookForAI } from '../services/worldInfoScanner';
import { processVariableUpdates } from '../services/variableEngine';
import { processWithRegex } from '../services/regexService';
import { scanWorldInfoWithAI } from '../services/geminiService';
import { getGlobalSmartScanSettings } from '../services/settingsService'; // Import Global Settings
import { dispatchSystemLog } from '../services/logBridge';

export interface WorldSystemResult {
    // Updated to be async to support AI calls
    scanInput: (
        text: string, 
        worldInfoState: Record<string, boolean>,
        worldInfoRuntime: Record<string, WorldInfoRuntimeStats>,
        worldInfoPinned: Record<string, boolean>,
        preset?: SillyTavernPreset, 
        historyForScan?: string[],
        latestInput?: string, 
        variables?: Record<string, any>, 
        dynamicEntries?: WorldInfoEntry[],
        currentTurnIndex?: number,
        overrideAiUids?: string[] // NEW: Override option for regeneration
    ) => Promise<{
        activeEntries: WorldInfoEntry[];
        updatedRuntimeState: Record<string, WorldInfoRuntimeStats>;
        smartScanLog?: { fullPrompt: string, rawResponse: string, latency: number }; 
    }>;
    processOutput: (
        rawContent: string,
        currentVariables: Record<string, any>
    ) => {
        updatedVariables: Record<string, any>;
        displayContent: string;
        interactiveHtml: string | null;
        diagnosticLog: string;
        variableLog: string;
        originalRawContent: string;
    };
    isScanning: boolean;
}

export const useWorldSystem = (card: CharacterCard | null): WorldSystemResult => {
    const [isScanning, setIsScanning] = useState(false);

    const scanInput = useCallback(async (
        textToScan: string,
        worldInfoState: Record<string, boolean>,
        worldInfoRuntime: Record<string, WorldInfoRuntimeStats>,
        worldInfoPinned: Record<string, boolean>,
        preset?: SillyTavernPreset, // Legacy arg, mostly ignored for smart scan now
        historyForScan: string[] = [],
        latestInput: string = '',
        variables: Record<string, any> = {},
        dynamicEntries: WorldInfoEntry[] = [],
        currentTurnIndex: number = 0, // Default 0
        overrideAiUids?: string[] // NEW Parameter
    ) => {
        // FETCH GLOBAL SETTINGS
        const globalSettings = getGlobalSmartScanSettings();

        // MERGE LOGIC: Combine static entries from card with dynamic entries from RPG
        const staticEntries = card?.char_book?.entries || [];
        const allEntries = [...staticEntries, ...dynamicEntries];
        
        let aiActiveUids: string[] = [];
        let smartScanLogData;

        // Determine Mode from GLOBAL SETTINGS
        const mode = globalSettings.mode || 'keyword';
        const isAiEnabled = (globalSettings.enabled) && (mode === 'hybrid' || mode === 'ai_only');

        // --- SMART SCAN LOGIC (AI PART) ---
        if (isAiEnabled) {
            
            // CHECK OVERRIDE FIRST
            if (overrideAiUids && overrideAiUids.length > 0) {
                // If we have an override (Regeneration), skip the API call
                aiActiveUids = overrideAiUids;
                dispatchSystemLog('state', 'system', `[Smart Scan] Skipped API call. Reusing ${aiActiveUids.length} UIDs from previous turn.`);
            } else {
                // Normal AI Scan
                setIsScanning(true);
                const startTime = Date.now();
                
                try {
                    // 1. Prepare Context (History) - Use global depth
                    const depth = globalSettings.depth || 3;
                    const chatContext = historyForScan.slice(-depth).join('\n');
                    
                    // 2. Prepare State String
                    let stateString = "";
                    if (variables && Object.keys(variables).length > 0) {
                        stateString = Object.entries(variables)
                            .map(([k, v]) => {
                                if (Array.isArray(v) && v.length > 1 && typeof v[1] === 'string') {
                                    return `- ${k}: ${v[0]} (${v[1]})`; 
                                }
                                return `- ${k}: ${JSON.stringify(v)}`;
                            })
                            .join('\n');
                    }

                    // 3. Prepare Lorebook Payload (Separated)
                    // NOW USING currentTurnIndex to flag dormant entries
                    // AND PASSING scan_strategy for full context option
                    const strategy = globalSettings.scan_strategy || 'efficient';
                    const { contextString, candidateString } = prepareLorebookForAI(allEntries, currentTurnIndex, worldInfoRuntime, strategy);

                    // Only scan if there are candidates to choose from
                    if (candidateString) {
                        // 4. Call API with Global Settings
                        const { selectedIds, outgoingPrompt, rawResponse } = await scanWorldInfoWithAI(
                            chatContext, 
                            contextString,
                            candidateString,
                            latestInput || textToScan, 
                            stateString,
                            globalSettings.model || 'gemini-flash-lite-latest',
                            globalSettings.system_prompt 
                        );
                        
                        // 5. Apply "Token Budget" / Max Entries from Global Settings
                        const maxEntries = globalSettings.max_entries || 5;
                        aiActiveUids = selectedIds.slice(0, maxEntries);
                        
                        const endTime = Date.now();
                        smartScanLogData = {
                            fullPrompt: outgoingPrompt,
                            rawResponse: rawResponse,
                            latency: endTime - startTime
                        };
                    }
                } catch (e) {
                    console.error("[Smart Scan] Error:", e);
                    // Re-throw error to be caught by useChatFlow
                    throw e;
                } finally {
                    setIsScanning(false);
                }
            }
        }

        // --- HYBRID / KEYWORD SCANNING ---
        const result = performWorldInfoScan(
            textToScan, 
            allEntries, 
            worldInfoState, 
            worldInfoRuntime, 
            worldInfoPinned,
            aiActiveUids,
            mode === 'ai_only', // Bypass keyword check?
            currentTurnIndex, // Pass turn for Lifecycle check
            globalSettings.aiStickyDuration // Pass Global AI Sticky Override
        );

        return { ...result, smartScanLog: smartScanLogData };
    }, [card]);

    const processOutput = useCallback((
        rawContent: string,
        currentVariables: Record<string, any>
    ) => {
        // 1. Variable Engine (Variable Processing Phase)
        const { updatedVariables, cleanedText, variableLog } = processVariableUpdates(rawContent, currentVariables);

        // 2. Regex / Script Engine (Display Processing Phase)
        const scripts = card?.extensions?.regex_scripts || [];
        const { displayContent, interactiveHtml, diagnosticLog } = processWithRegex(cleanedText, scripts, [2]);

        return {
            updatedVariables,
            displayContent,
            interactiveHtml,
            diagnosticLog,
            variableLog,
            originalRawContent: rawContent
        };
    }, [card]);

    return {
        scanInput,
        processOutput,
        isScanning
    };
};
