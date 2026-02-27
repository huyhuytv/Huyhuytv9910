
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { 
    ChatMessage, CharacterCard, SillyTavernPreset, UserPersona, 
    VisualState, WorldInfoRuntimeStats, SystemLogEntry, ChatTurnLog, 
    QuickReply, ScriptButton, SummaryQueueItem, WorldInfoEntry, RPGDatabase, NetworkLogEntry, RpgSnapshot
} from '../types';
// IMPORT SYNC LOGIC
import { syncDatabaseToLorebook } from '../services/medusaService'; 
import { getArenaSettings, saveArenaSettings } from '../services/settingsService';

interface ChatState {
    sessionId: string | null;
    card: (CharacterCard & { fileName?: string }) | null;
    preset: SillyTavernPreset | null;
    persona: UserPersona | null;
    mergedSettings: SillyTavernPreset | null;
    
    messages: ChatMessage[];
    variables: Record<string, any>;
    extensionSettings: Record<string, any>;
    worldInfoRuntime: Record<string, WorldInfoRuntimeStats>;
    
    longTermSummaries: string[];
    summaryQueue: SummaryQueueItem[];
    
    // Story Mode State
    storyQueue: string[];

    worldInfoState: Record<string, boolean>;
    worldInfoPinned: Record<string, boolean>;
    worldInfoPlacement: Record<string, 'before' | 'after' | undefined>;
    authorNote: string;
    lastStateBlock: string;
    initialDiagnosticLog: string;

    // NEW: Persistent RPG Notification
    rpgNotification: string | null;
    // NEW: Generated Lorebook Entries
    generatedLorebookEntries: WorldInfoEntry[];
    // NEW: Snapshot for Index Mapping
    rpgSnapshot?: RpgSnapshot;

    visualState: VisualState;
    quickReplies: QuickReply[];
    scriptButtons: ScriptButton[];
    
    logs: {
        turns: ChatTurnLog[];
        systemLog: SystemLogEntry[];
        worldInfoLog: string[];
        smartScanLog: string[];
        mythicLog: string[];
        networkLog: NetworkLogEntry[]; // NEW
    };
    
    isLoading: boolean;
    isSummarizing: boolean;
    isInputLocked: boolean;
    isAutoLooping: boolean;
    error: string | null;
    
    // Arena Mode State
    isArenaMode: boolean;
    arenaModelId: string | null; // The challenger model ID
    arenaProvider: 'gemini' | 'openrouter' | 'proxy' | null; // NEW: Challenger Provider
    arenaUserProfileId: string | null; // NEW: Selected Proxy Profile ID for Arena

    abortController: AbortController | null;
}

interface ChatActions {
    setSessionData: (data: Partial<ChatState>) => void;
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    setMessages: (messages: ChatMessage[]) => void;
    setVariables: (vars: Record<string, any>) => void;
    
    addSystemLog: (log: SystemLogEntry) => void;
    addLogTurn: (turn: ChatTurnLog) => void;
    updateCurrentTurn: (updates: Partial<ChatTurnLog>) => void;
    addWorldInfoLog: (log: string) => void;
    addSmartScanLog: (log: string) => void;
    addMythicLog: (log: string) => void; 
    addNetworkLog: (log: NetworkLogEntry) => void; // NEW
    
    setLongTermSummaries: (summaries: string[]) => void;
    setSummaryQueue: (queue: SummaryQueueItem[]) => void;
    setStoryQueue: (queue: string[]) => void; // NEW
    clearStoryQueue: () => void; // NEW: Clear queue to stop story mode
    setLastStateBlock: (block: string) => void;
    
    setIsInputLocked: (locked: boolean) => void;
    setIsAutoLooping: (looping: boolean) => void;
    setQuickReplies: (replies: QuickReply[]) => void;
    setScriptButtons: (buttons: ScriptButton[]) => void;
    
    // NEW: Action to set RPG Notification
    setRpgNotification: (content: string | null) => void;
    // NEW: Set Generated Lorebook Entries
    setGeneratedLorebookEntries: (entries: WorldInfoEntry[]) => void;
    
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setAbortController: (ac: AbortController | null) => void;

    // Arena Actions
    setArenaMode: (enabled: boolean) => void;
    setArenaModelId: (modelId: string) => void;
    setArenaProvider: (provider: 'gemini' | 'openrouter' | 'proxy') => void; // NEW
    setArenaUserProfileId: (profileId: string | null) => void; // NEW

    clearLogs: () => void;
    resetStore: () => void;

    updateRpgCell: (tableId: string, rowIndex: number, colIndex: number, value: any) => void;
    addRpgRow: (tableId: string) => void;
    deleteRpgRow: (tableId: string, rowIndex: number) => void;
    
    // NEW: Bulk Update for Save/Cancel pattern
    replaceRpgTableRows: (tableId: string, newRows: any[][]) => void;

    // NEW: Reload RPG Config from Template
    reloadRpgConfig: (templateDb: RPGDatabase) => void;
}

// Initialize Arena Settings from LocalStorage
const storedArena = getArenaSettings();

const initialState: Omit<ChatState, 'abortController'> = {
    sessionId: null, card: null, preset: null, persona: null, mergedSettings: null,
    messages: [], variables: {}, extensionSettings: {}, worldInfoRuntime: {},
    longTermSummaries: [], summaryQueue: [], storyQueue: [], worldInfoState: {}, 
    worldInfoPinned: {}, worldInfoPlacement: {}, authorNote: '',
    lastStateBlock: '', initialDiagnosticLog: '', rpgNotification: null, generatedLorebookEntries: [],
    visualState: {}, quickReplies: [], scriptButtons: [],
    logs: { turns: [], systemLog: [], worldInfoLog: [], smartScanLog: [], mythicLog: [], networkLog: [] },
    isLoading: false, isSummarizing: false, isInputLocked: false, isAutoLooping: false, error: null,
    isArenaMode: storedArena.enabled,
    arenaModelId: storedArena.modelId,
    arenaProvider: storedArena.provider,
    arenaUserProfileId: storedArena.userProfileId
};

export const useChatStore = create<ChatState & ChatActions>()(
    immer((set, get) => ({
        ...initialState,
        abortController: null,

        setSessionData: (data) => set((state) => { Object.assign(state, data); }),

        updateRpgCell: (tableId, rowIndex, colIndex, value) => set((state) => {
            if (!state.card?.rpg_data) return;
            const table = state.card.rpg_data.tables.find(t => t.config.id === tableId);
            if (table && table.data.rows[rowIndex]) {
                table.data.rows[rowIndex][colIndex + 1] = value;
                state.card.rpg_data.lastUpdated = Date.now();
                
                // AUTO SYNC: Regenerate lorebook entries when data changes
                try {
                    state.generatedLorebookEntries = syncDatabaseToLorebook(state.card.rpg_data);
                } catch(e) {
                    console.error("Sync error in updateRpgCell", e);
                }
            }
        }),

        addRpgRow: (tableId) => set((state) => {
            if (!state.card?.rpg_data) return;
            const table = state.card.rpg_data.tables.find(t => t.config.id === tableId);
            if (table) {
                const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newRow = new Array(table.config.columns.length + 1).fill("");
                newRow[0] = newId;
                table.data.rows.push(newRow);
                state.card.rpg_data.lastUpdated = Date.now();

                // AUTO SYNC
                try {
                    state.generatedLorebookEntries = syncDatabaseToLorebook(state.card.rpg_data);
                } catch(e) {
                    console.error("Sync error in addRpgRow", e);
                }
            }
        }),

        deleteRpgRow: (tableId, rowIndex) => set((state) => {
            if (!state.card?.rpg_data) return;
            const table = state.card.rpg_data.tables.find(t => t.config.id === tableId);
            if (table) {
                table.data.rows.splice(rowIndex, 1);
                state.card.rpg_data.lastUpdated = Date.now();

                // AUTO SYNC
                try {
                    state.generatedLorebookEntries = syncDatabaseToLorebook(state.card.rpg_data);
                } catch(e) {
                    console.error("Sync error in deleteRpgRow", e);
                }
            }
        }),
        
        replaceRpgTableRows: (tableId, newRows) => set((state) => {
             if (!state.card?.rpg_data) return;
            const table = state.card.rpg_data.tables.find(t => t.config.id === tableId);
            if (table) {
                table.data.rows = newRows;
                state.card.rpg_data.lastUpdated = Date.now();

                // AUTO SYNC
                try {
                    state.generatedLorebookEntries = syncDatabaseToLorebook(state.card.rpg_data);
                } catch(e) {
                    console.error("Sync error in replaceRpgTableRows", e);
                }
            }
        }),

        reloadRpgConfig: (templateDb) => set((state) => {
            if (!state.card) return;
            
            // 1. Deep Clone Template (Structure)
            const newDb = JSON.parse(JSON.stringify(templateDb)) as RPGDatabase;
            const currentDb = state.card.rpg_data;

            // 2. Inject existing Data (Rows) into new Structure
            if (currentDb) {
                newDb.tables.forEach(newTable => {
                    // Find matching table in current session by ID
                    const oldTable = currentDb.tables.find(t => t.config.id === newTable.config.id);
                    if (oldTable) {
                        // Preserve Rows
                        newTable.data.rows = oldTable.data.rows;
                    } else {
                        // If table is new in template, it starts empty (which is correct)
                        newTable.data.rows = [];
                    }
                });
            } else {
                // If no current DB, just use template as is (initialized empty)
            }

            // 3. Update State
            state.card.rpg_data = newDb;
            newDb.lastUpdated = Date.now();

            // 4. Force Live-Link Sync immediately
            try {
                const generatedEntries = syncDatabaseToLorebook(newDb);
                state.generatedLorebookEntries = generatedEntries;
                
                // Log success
                state.logs.systemLog.unshift({
                    level: 'state',
                    source: 'system',
                    message: `[RPG Config Reload] Đã đồng bộ cấu trúc từ thẻ gốc. Dữ liệu hàng được giữ nguyên. Đã tạo ${generatedEntries.length} mục Live-Link.`,
                    timestamp: Date.now()
                });
            } catch(e) {
                console.error("Sync error in reloadRpgConfig", e);
            }
        }),
    }))
);
