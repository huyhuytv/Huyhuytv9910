
// --- RUNTIME STATE & UI TYPES ---

export interface PromptSection {
    id: string;
    name: string;
    content: string;
    role: string;
    subSections?: string[];
}

export interface SystemLogEntry {
    level: 'error' | 'warn' | 'script-error' | 'api-error' | 'script-success' | 'interaction' | 'api' | 'state' | 'log';
    source: 'iframe' | 'regex' | 'variable' | 'system' | 'console' | 'network' | 'script';
    message: string;
    timestamp: number;
    stack?: string;
    payload?: any;
}

export interface NetworkLogEntry {
    id: string;
    timestamp: number;
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any; // Can be object or string
    source: 'proxy' | 'openrouter' | 'gemini';
}

export interface ChatTurnLog {
    timestamp: number;
    prompt: PromptSection[]; 
    response: string;
    summary?: string;
    systemLogs: SystemLogEntry[];
}

export interface QuickReply {
    label: string;
    message?: string;
    action?: string;
}

export interface ScriptButton {
    id: string;
    label: string;
    scriptId: string;
    eventId: string;
}

export interface SummaryQueueItem {
    id: string;
    status: 'pending' | 'processing' | 'failed';
    timestamp: number;
    error?: string;
}

export interface WorldInfoRuntimeStats {
    stickyDuration: number;
    cooldownDuration: number;
    lastActiveTurn?: number; // Tracks the last turn index this entry was active/interacted with
}

export interface VisualState {
    backgroundImage?: string;
    musicUrl?: string;
    ambientSoundUrl?: string;
    globalClass?: string;
    // Sound Notifications
    systemSoundEnabled?: boolean; // Mặc định true
    aiSoundUrl?: string; // Custom URL cho AI
    rpgSoundUrl?: string; // Custom URL cho RPG
    
    // NEW: Tùy chọn tắt chế độ tương tác (HTML/Script/Regex)
    disableInteractiveMode?: boolean;
}

// NEW: Trạng thái lỗi tương tác cho Modal
export interface InteractiveErrorState {
    hasError: boolean;
    title: string;
    message: string;
    errorDetails?: string;
    canIgnore: boolean;
}