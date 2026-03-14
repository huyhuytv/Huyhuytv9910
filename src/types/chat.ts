
// --- PERSISTENCE DATA (Saved to DB) ---

import type { VisualState, WorldInfoRuntimeStats, SummaryQueueItem, ChatTurnLog, SystemLogEntry, NetworkLogEntry } from './app';
import type { WorldInfoEntry } from './character';
import type { RPGDatabase, RpgSnapshot } from './rpg';

export interface ArenaState {
    enabled: boolean;
    modelA: {
        name: string;
        content: string;
        thinking?: string; // Optional thinking block storage
        completed?: boolean; // Track if this specific model has finished generating
    };
    modelB: {
        name: string;
        content: string;
        thinking?: string;
        completed?: boolean; // Track if this specific model has finished generating
    };
    selected: 'A' | 'B' | null; // Null means waiting for user selection
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    content: string;
    interactiveHtml?: string;
    originalRawContent?: string;
    contextState?: Record<string, any>; // Variables snapshot
    
    // NEW: Full World State Snapshots
    rpgState?: RPGDatabase; // RPG Engine snapshot
    worldInfoRuntime?: Record<string, WorldInfoRuntimeStats>; // Cooldowns/Sticky snapshot
    worldInfoState?: Record<string, boolean>; // Enabled/Disabled toggles snapshot
    
    // NEW: Persist the World Info UIDs active during this turn (for smart regeneration)
    activeLorebookUids?: string[];

    timestamp?: number;
    
    // --- SNAPSHOT SYSTEM ---
    rpgSnapshot?: RpgSnapshot;

    // --- ARENA MODE DATA ---
    arena?: ArenaState;
}

export interface ChatSession {
    sessionId: string;
    characterFileName: string;
    presetName: string;
    userPersonaId: string | null;
    
    // History & Memory
    chatHistory: ChatMessage[];
    longTermSummaries: string[];
    
    // Story Mode Queue (NEW)
    storyQueue?: string[]; // Array of text chunks waiting to be processed
    
    // Runtime State Persistence
    summaryQueue?: SummaryQueueItem[];
    variables: Record<string, any>;
    extensionSettings?: Record<string, any>;
    worldInfoState?: Record<string, boolean>;
    worldInfoPinned?: Record<string, boolean>;
    worldInfoPlacement?: Record<string, 'before' | 'after' | undefined>;
    worldInfoRuntime?: Record<string, WorldInfoRuntimeStats>;
    visualState?: VisualState;
    authorNote?: string;
    lastStateBlock?: string;
    
    // --- MYTHIC ENGINE STATE ---
    rpgState?: RPGDatabase; // Stores the current state of RPG tables
    // -------------------------

    // --- SNAPSHOT SYSTEM (Fix Index Shifting) ---
    rpgSnapshot?: RpgSnapshot; // Stores the mapping of [Index -> UUID] for the current/last request
    // --------------------------------------------

    // --- LIVE LINK (Generated Lore) ---
    generatedLorebookEntries?: WorldInfoEntry[]; // Entries created by Mythic Engine for this session
    // ----------------------------------

    // --- LOGS PERSISTENCE (NEW) ---
    logs?: {
        turns: ChatTurnLog[];
        systemLog: SystemLogEntry[];
        worldInfoLog: string[];
        smartScanLog: string[];
        mythicLog: string[];
        networkLog?: NetworkLogEntry[]; // NEW
    };
    // -----------------------------

    // --- ARENA MODE STATE (NEW) ---
    isArenaMode?: boolean;
    arenaModelId?: string | null;
    arenaProvider?: 'gemini' | 'openrouter' | 'proxy' | null;
    arenaProfileId?: string | null;
    // -----------------------------

    // Meta
    lastMessageSnippet?: string;
    lastUpdated: number;
    initialDiagnosticLog?: string;
}
