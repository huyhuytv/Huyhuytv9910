
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { 
    ChatMessage, CharacterCard, SillyTavernPreset, UserPersona, 
    VisualState, WorldInfoRuntimeStats, SystemLogEntry, ChatTurnLog, 
    QuickReply, ScriptButton, SummaryQueueItem, WorldInfoEntry, RPGDatabase, NetworkLogEntry, RpgSnapshot
} from '../types';
// IMPORT SYNC LOGIC
import { syncDatabaseToLorebook } from '../services/medusaService'; 

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

const initialState: Omit<ChatState, 'abortController'> = {
    sessionId: null, card: null, preset: null, persona: null, mergedSettings: null,
    messages: [], variables: {}, extensionSettings: {}, worldInfoRuntime: {},
    longTermSummaries: [], summaryQueue: [], storyQueue: [], worldInfoState: {}, 
    worldInfoPinned: {}, worldInfoPlacement: {}, authorNote: '',
    lastStateBlock: '', initialDiagnosticLog: '', rpgNotification: null, generatedLorebookEntries: [],
    visualState: {}, quickReplies: [], scriptButtons: [],
    logs: { turns: [], systemLog: [], worldInfoLog: [], smartScanLog: [], mythicLog: [], networkLog: [] },
    isLoading: false, isSummarizing: false, isInputLocked: false, isAutoLooping: false, error: null,
    isArenaMode: false, arenaModelId: null
};

export const useChatStore = create<ChatState & ChatActions>()(
    immer((set) => ({
        ...initialState,
        abortController: null,

        setSessionData: (data) => set((state) => { Object.assign(state, data); }),
        addMessage: (msg) => set((state) => { state.messages.push(msg); }),
        updateMessage: (id, updates) => set((state) => {
            const m = state.messages.find(msg => msg.id === id);
            if (m) Object.assign(m, updates);
        }),
        setMessages: (messages) => set((state) => { state.messages = messages; }),
        setVariables: (vars) => set((state) => { state.variables = vars; }),
        
        addSystemLog: (log) => set((state) => { 
            state.logs.systemLog.unshift(log);
            if (state.logs.systemLog.length > 200) state.logs.systemLog.pop();
        }),
        addLogTurn: (turn) => set((state) => { state.logs.turns.unshift(turn); }),
        updateCurrentTurn: (updates) => set((state) => {
            if (state.logs.turns.length > 0) {
                Object.assign(state.logs.turns[0], updates);
            }
        }),
        addWorldInfoLog: (log) => set((state) => { state.logs.worldInfoLog.unshift(log); }),
        addSmartScanLog: (log) => set((state) => { state.logs.smartScanLog.unshift(log); }),
        addMythicLog: (log) => set((state) => { state.logs.mythicLog.unshift(log); }),
        addNetworkLog: (log) => set((state) => { 
            // DEFENSIVE FIX: Ensure networkLog array exists (handle old session structure)
            if (!state.logs.networkLog) {
                state.logs.networkLog = [];
            }
            state.logs.networkLog.unshift(log); 
            // Keep last 50 requests to avoid memory bloat
            if (state.logs.networkLog.length > 50) state.logs.networkLog.pop();
        }),
        
        setLongTermSummaries: (summaries) => set((state) => { state.longTermSummaries = summaries; }),
        setSummaryQueue: (queue) => set((state) => { state.summaryQueue = queue; }),
        setStoryQueue: (queue) => set((state) => { state.storyQueue = queue; }),
        clearStoryQueue: () => set((state) => { state.storyQueue = []; }), // Implementation
        setLastStateBlock: (block) => set((state) => { state.lastStateBlock = block; }),
        
        setIsInputLocked: (locked) => set((state) => { state.isInputLocked = locked; }),
        setIsAutoLooping: (looping) => set((state) => { state.isAutoLooping = looping; }),
        setQuickReplies: (replies) => set((state) => { state.quickReplies = replies; }),
        setScriptButtons: (buttons) => set((state) => { state.scriptButtons = buttons; }),
        
        setRpgNotification: (content) => set((state) => { state.rpgNotification = content; }),
        setGeneratedLorebookEntries: (entries) => set((state) => { state.generatedLorebookEntries = entries; }),
        
        setLoading: (loading) => set((state) => { state.isLoading = loading; }),
        setError: (error) => set((state) => { state.error = error; }),
        setAbortController: (ac) => set((state) => { state.abortController = ac; }),

        setArenaMode: (enabled) => set((state) => { state.isArenaMode = enabled; }),
        setArenaModelId: (modelId) => set((state) => { state.arenaModelId = modelId; }),

        clearLogs: () => set((state) => { state.logs = { turns: [], systemLog: [], worldInfoLog: [], smartScanLog: [], mythicLog: [], networkLog: [] }; }),
        resetStore: () => set((state) => { Object.assign(state, initialState); state.abortController = null; }),

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
