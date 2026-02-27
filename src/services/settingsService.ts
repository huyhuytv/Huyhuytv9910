
const ACTIVE_MODEL_KEY = 'sillyTavernStudio_activeModel'; // Legacy, kept for fallback
const API_SETTINGS_KEY = 'sillyTavernStudio_apiSettings';
const API_KEY_INDEX_KEY = 'sillyTavernStudio_apiKeyIndex';
const OPENROUTER_API_KEY_KEY = 'sillyTavernStudio_openRouterApiKey';
const PROXY_URL_KEY = 'sillyTavernStudio_proxyUrl';
const PROXY_PASSWORD_KEY = 'sillyTavernStudio_proxyPassword';
const PROXY_LEGACY_MODE_KEY = 'sillyTavernStudio_proxyLegacyMode';
const PROXY_FOR_TOOLS_KEY = 'sillyTavernStudio_proxyForTools';
const PROXY_PROFILES_KEY = 'sillyTavernStudio_proxyProfiles';
const PROXY_MODELS_KEY = 'sillyTavernStudio_proxyModels'; // NEW KEY
const GLOBAL_CONNECTION_KEY = 'sillyTavernStudio_globalConnection';
const GLOBAL_SMART_SCAN_KEY = 'sillyTavernStudio_smartScanGlobal';
const GLOBAL_CONTEXT_KEY = 'sillyTavernStudio_globalContext';
const GLOBAL_TTS_KEY = 'sillyTavernStudio_ttsGlobal';

// ... (Existing options and interfaces remain same) ...
export const MODEL_OPTIONS = [
    { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro Preview' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash Preview' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash-Lite' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
];

export const PROXY_MODEL_OPTIONS = [
    ...MODEL_OPTIONS,
    { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'gpt-4o', name: 'GPT-4o' }
];

export type CompletionSource = 'gemini' | 'openrouter' | 'proxy';
export type ProxyProtocol = 'openai' | 'google_native';

export interface GlobalConnectionSettings {
    source: CompletionSource;
    gemini_model: string;
    openrouter_model: string;
    proxy_model: string;      // Dùng cho Chat chính
    proxy_tool_model: string; // Dùng cho Tác vụ phụ (Scan, Tóm tắt, Dịch)
    proxy_protocol: ProxyProtocol; // NEW: Protocol selection
}

// Global Smart Scan Configuration
export interface GlobalSmartScanSettings {
    enabled: boolean;
    mode: 'keyword' | 'hybrid' | 'ai_only';
    model: string;
    depth: number;
    max_entries: number;
    aiStickyDuration: number;
    system_prompt: string;
    scan_strategy: 'efficient' | 'full'; 
}

// Global Context & Memory Settings
export interface GlobalContextSettings {
    context_depth: number;
    summarization_chunk_size: number;
    context_mode: 'standard' | 'ai_only';
    summarization_prompt: string;
}

// Global TTS Settings
export interface GlobalTTSSettings {
    tts_enabled: boolean;
    tts_streaming: boolean;
    tts_provider: 'gemini' | 'native';
    tts_voice: string; // Gemini voice name
    tts_native_voice: string; // Browser voice URI
    tts_rate: number;
    tts_pitch: number;
}

// NEW: Proxy Profile Interface
export interface ProxyProfile {
    id: string;
    name: string;
    url: string;
    password: string;
    legacyMode: boolean;
    proxyForTools: boolean;
    protocol: ProxyProtocol;
    chatModel: string;
    toolModel: string;
}

const DEFAULT_CONNECTION_SETTINGS: GlobalConnectionSettings = {
    source: 'gemini',
    gemini_model: 'gemini-3-flash-preview',
    openrouter_model: '',
    proxy_model: 'gemini-3-pro-preview',
    proxy_tool_model: 'gemini-3-flash-preview',
    proxy_protocol: 'openai' // Default to OpenAI standard
};

// Default Prompt extracted from previous defaultPreset
export const DEFAULT_SMART_SCAN_PROMPT = `Bạn là Omniscient Narrative Director (OND) - Đạo diễn Kể chuyện Toàn năng cho hệ thống nhập vai thế hệ mới.

NHIỆM VỤ TỐI THƯỢNG:
Không chỉ cung cấp dữ liệu, bạn phải KIẾN TẠO SÂN KHẤU.
Bạn phải đi trước người chơi 2-3 bước, chuẩn bị sẵn sàng cả những biến cố có thể xảy ra và những chi tiết "làm màu" (flavor) để thế giới trở nên sống động, bất ngờ và giàu chiều sâu.

TRIẾT LÝ VẬN HÀNH:
"Thà thừa một chút dữ liệu để tạo ra sự tình cờ thú vị (Serendipity), còn hơn để câu chuyện trôi qua tẻ nhạt và thiếu bối cảnh."

PHÂN VÙNG DỮ LIỆU (BẤT BIẾN)

A. VÙNG THAM KHẢO (READ-ONLY):
Dùng để hiểu mạch truyện. KHÔNG CHỌN ID TỪ ĐÂY.
<KIẾN THỨC NỀN>: {{context}}
<TRẠNG THÁI HIỆN TẠI>: {{state}} (Chú ý: Máu, Mana, Tiền, Địa vị, Thời gian)
<LỊCH SỬ HỘI THOẠI>: {{history}}

B. VÙNG KÍCH HOẠT:
<HÀNH ĐỘNG MỚI NHẤT>: {{input}}

C. VÙNG ỨNG VIÊN (KHO TÀNG):
Chỉ được phép trích xuất ID từ đây.
<DANH SÁCH ỨNG VIÊN WI>: {{candidates}}

QUY TRÌNH TƯ DUY NÂNG CAO (DIRECTOR'S WORKFLOW)

BƯỚC 1: QUÉT SÂU & CẢM NHẬN (Deep Scan)

Phân tích Hành động: User đang làm gì? (Chiến đấu, Thương thuyết, Di chuyển, Chế tạo...).

Phân tích Tâm lý & Không khí: Bối cảnh hiện tại là gì? (Căng thẳng, Rùng rợn, Lãng mạn, Hùng vĩ?).
Ví dụ: Đi trong rừng đêm -> Cần không khí bí ẩn -> Tìm WI về âm thanh lạ, sương mù, truyền thuyết ma quái.

Kiểm tra State: Có chỉ số nào "báo động" không? (Đói, Mệt, Bị thương -> Cần tìm WI về Thức ăn, Nghỉ ngơi, Y tế).

BƯỚC 2: MÔ PHỎNG HIỆU ỨNG CÁNH BƯỚM (Butterfly Effect Simulation)

Kích hoạt Logic N+2, N+3: Đừng chỉ nhìn bước kế tiếp. Hãy tự hỏi: "Nếu A xảy ra, B sẽ đến, và C có thể xuất hiện."

Mô hình: Hành động -> (N+1: Phản ứng trực tiếp) -> (N+2: Hệ quả/Rủi ro) -> (N+3: Phần thưởng/Sự kiện mới).
Ví dụ: User "Móc túi lính gác" -> (N+1: Kỹ năng trộm) -> (N+2: Bị phát hiện/Truy đuổi -> Cần WI "Luật pháp/Nhà tù") -> (N+3: Lục soát đồ -> Cần WI "Vật phẩm ngẫu nhiên/Manh mối bí mật").

Chiến thuật Pre-fetching (Nạp đạn trước): Với các nhánh tương lai có xác suất xảy ra >30%, hãy lấy WI ngay lập tức.

BƯỚC 3: QUÉT RADAR & GIEO MẦM (Atmosphere & Seeding)
(Kết hợp tư duy Sân khấu 360 độ và Thế giới tự vận hành)

A. Quét Bán Kính & Không Khí (Atmospheric Radar):

Tư duy: "Xây dựng sân khấu 360 độ". Quét tìm những thứ đang tồn tại xung quanh DÙ NGƯỜI CHƠI KHÔNG TƯƠNG TÁC.

Hành động: Tìm kiếm ID của các địa điểm lân cận, NPC nền, hoặc các yếu tố môi trường (âm thanh, mùi vị) đang hiện hữu.
=> MỤC TIÊU: Cung cấp dữ liệu để AI chính có nhiều lựa chọn tương tác bất ngờ cho tương lai gần.

B. Gieo Mầm Cốt Truyện (Narrative Seeding):

Kích hoạt chế độ "Thế giới tự vận hành": CHỦ ĐỘNG chọn 2-4 mục World Info ngẫu nhiên nhưng tiềm năng từ danh sách.

Ưu tiên: Các địa điểm/NPC ở xa, Tin đồn (Rumors), hoặc Lore về lịch sử vùng đất.

Tư duy: "Hãy ném vào một biến số lạ để xem người chơi hoặc AI Chính xử lý thế nào."
=> MỤC TIÊU: Tạo ra các SỰ KIỆN SONG SONG (Parallel Events), chứng minh thế giới này vẫn trôi chảy và đầy bí ẩn ngay cả khi người chơi đứng yên.

BƯỚC 4: LỌC & TỔNG HỢP (The Final Cut)

Hợp nhất kết quả từ 3 nguồn:

Direct Match: Khớp từ khóa (Ưu tiên cao).

Prediction: Dự đoán N+2, N+3 (Ưu tiên trung bình).

Atmosphere & Seeding: Yếu tố môi trường và ngẫu nhiên (Ưu tiên thấp nhưng bắt buộc có).

Quy tắc Vàng: LOẠI BỎ các ID đã có trong {{context}} hoặc vừa xuất hiện ở {{history}} (trừ khi cần nhấn mạnh lại).

CẤU TRÚC OUTPUT JSON
Hãy viết suy nghĩ của bạn vào _thought theo cấu trúc tư duy của một Đạo diễn.

{ "_thought": "1. [Phân tích]: User đang [Hành động] trong không khí [Không khí]. 2. [Dự đoán N+3]: Hành động này dễ dẫn tới [Sự kiện X], cần chuẩn bị trước [WI A, WI B]. 3. [Môi trường & Gieo mầm]: Xung quanh có [WI C - Âm thanh/NPC], đồng thời gieo thêm [WI D - Tin đồn xa] để tạo biến số.", "selected_ids": ["id_direct", "id_prediction", "id_atmosphere", "id_seeding_lore"] }`;

// Default Chronicle Scribe Prompt
export const DEFAULT_CONTEXT_PROMPT = `Vai trò: Bạn là một Thư ký Biên niên sử Tận tụy (Dedicated Chronicle Scribe). Nhiệm vụ của bạn là ghi chép lại lịch sử của thế giới này một cách chi tiết, sống động và liền mạch.

Nhiệm vụ: Hãy biến dữ liệu từ đoạn hội thoại dưới đây thành một chương biên niên sử hoàn chỉnh. Không tóm tắt, hãy tường thuật chi tiết từng nhịp độ của câu chuyện.


PHẦN 1: BỐI CẢNH ĐÃ BIẾT (CHỈ THAM KHẢO, KHÔNG viết LẠI):
{{recent_summaries}}

 phần 2, DỮ LIỆU CẦN XỬ LÝ:

{{chat_history_slice}}

YÊU CẦU VỀ PHONG CÁCH VÀ CẤU TRÚC:

Cấu trúc nối tiếp (Linear Narrative):

Trình bày mọi việc theo trình tự thời gian nghiêm ngặt. Sự kiện này dẫn đến sự kiện kia.

Mỗi phân đoạn phải là một khối thông tin đầy đủ: Bối cảnh -> Hành động của nhân vật -> Phản ứng của môi trường/NPC -> Kết quả.

Loại bỏ hoàn toàn bảng biểu và danh mục tách biệt:

KHÔNG tạo các mục như "Kho đồ", "Chỉ số", hay "Mối quan hệ" ở cuối bài.

Lồng ghép trực tiếp: Ví dụ: Thay vì ghi "Vật phẩm: Kiếm sắt", hãy viết: "Sau cuộc trò chuyện, người thợ rèn đã trao cho bạn một thanh kiếm sắt nặng trịch, sự tin tưởng trong mắt ông ta rõ ràng đã tăng lên so với lúc đầu."

Mọi sự thay đổi về chỉ số (máu, mana, tiền), trang bị, hay thái độ của NPC phải được mô tả như một phần tự nhiên của lời kể.

Tính chi tiết và Liên tục:

Ghi lại các đoạn hội thoại quan trọng bằng cách lồng vào văn cảnh (có thể dùng trích dẫn trực tiếp trong đoạn văn).

Chú trọng vào cử chỉ, ánh mắt, không khí và sự thay đổi nội tâm của các nhân vật.

"Sử dụng góc nhìn thứ ba toàn tri (Third-person omniscient) để miêu tả hành động và nội tâm nhân vật, nhưng giữ giọng văn điềm tĩnh, không phán xét của một người ghi chép sử sách." tuyệt đối không được tự ý bình luận vào trong  biên niên sử, không dùng gạch đầu dòng khô khan.

Nguyên tắc "Thà thừa còn hơn thiếu":

Không lược bỏ bất kỳ chi tiết nhỏ nào (vật trang trí, thời tiết, cảm giác của nhân vật).

Đảm bảo người đọc có thể nắm bắt được toàn bộ trạng thái nhân vật và thế giới chỉ thông qua việc đọc nội dung văn bản.
YÊU CẦU:
Hãy viết tiếp diễn biến câu chuyện dựa trên PHẦN 1, nhưng chỉ  tổng hợp các sự kiện nằm trong PHẦN 2.
Đảm bảo bản  biên niên sử mới nối tiếp mạch lạc với bối cảnh cũ.`;

export const DEFAULT_SMART_SCAN_SETTINGS: GlobalSmartScanSettings = {
    enabled: true,
    mode: 'ai_only', // Default to advanced mode
    model: 'gemini-3-flash-preview',
    depth: 6,
    max_entries: 20,
    aiStickyDuration: 5,
    system_prompt: DEFAULT_SMART_SCAN_PROMPT,
    scan_strategy: 'efficient' // Default to truncation logic
};

export const DEFAULT_GLOBAL_CONTEXT_SETTINGS: GlobalContextSettings = {
    context_depth: 12, // Default: 12 turns (Requested)
    summarization_chunk_size: 6, // Default: 6 turns per chunk (Requested)
    context_mode: 'ai_only', // Default: AI Only mode for summaries
    summarization_prompt: DEFAULT_CONTEXT_PROMPT
};

// NEW: Default TTS Settings
export const DEFAULT_GLOBAL_TTS_SETTINGS: GlobalTTSSettings = {
    tts_enabled: false,
    tts_streaming: false,
    tts_provider: 'gemini',
    tts_voice: 'Kore',
    tts_native_voice: '',
    tts_rate: 1,
    tts_pitch: 1
};


const DEFAULT_PROXY_URL = 'http://127.0.0.1:8889';

interface ApiSettings {
    useDefault: boolean;
    keys: string[];
}

export const getConnectionSettings = (): GlobalConnectionSettings => {
    try {
        const stored = localStorage.getItem(GLOBAL_CONNECTION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_CONNECTION_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load connection settings", e);
    }
    return DEFAULT_CONNECTION_SETTINGS;
};

export const saveConnectionSettings = (settings: GlobalConnectionSettings): void => {
    localStorage.setItem(GLOBAL_CONNECTION_KEY, JSON.stringify(settings));
};

// --- GLOBAL SMART SCAN SETTINGS ---
export const getGlobalSmartScanSettings = (): GlobalSmartScanSettings => {
    try {
        const stored = localStorage.getItem(GLOBAL_SMART_SCAN_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_SMART_SCAN_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load smart scan global settings", e);
    }
    return DEFAULT_SMART_SCAN_SETTINGS;
};

export const saveGlobalSmartScanSettings = (settings: GlobalSmartScanSettings): void => {
    localStorage.setItem(GLOBAL_SMART_SCAN_KEY, JSON.stringify(settings));
};

// --- GLOBAL CONTEXT SETTINGS ---
export const getGlobalContextSettings = (): GlobalContextSettings => {
    try {
        const stored = localStorage.getItem(GLOBAL_CONTEXT_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_GLOBAL_CONTEXT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load global context settings", e);
    }
    return DEFAULT_GLOBAL_CONTEXT_SETTINGS;
};

export const saveGlobalContextSettings = (settings: GlobalContextSettings): void => {
    localStorage.setItem(GLOBAL_CONTEXT_KEY, JSON.stringify(settings));
};

// --- GLOBAL TTS SETTINGS ---
export const getGlobalTTSSettings = (): GlobalTTSSettings => {
    try {
        const stored = localStorage.getItem(GLOBAL_TTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_GLOBAL_TTS_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load global TTS settings", e);
    }
    return DEFAULT_GLOBAL_TTS_SETTINGS;
};

export const saveGlobalTTSSettings = (settings: GlobalTTSSettings): void => {
    localStorage.setItem(GLOBAL_TTS_KEY, JSON.stringify(settings));
};

// --- PROXY PROFILES ---
export const getProxyProfiles = (): ProxyProfile[] => {
    try {
        const stored = localStorage.getItem(PROXY_PROFILES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load proxy profiles", e);
    }
    return [];
};

export const saveProxyProfiles = (profiles: ProxyProfile[]): void => {
    localStorage.setItem(PROXY_PROFILES_KEY, JSON.stringify(profiles));
};

// --- STORED PROXY MODELS (NEW) ---
export interface StoredProxyModel {
    id: string;
    name: string;
}

export const getStoredProxyModels = (): StoredProxyModel[] => {
    try {
        const stored = localStorage.getItem(PROXY_MODELS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load stored proxy models", e);
    }
    return [];
};

export const saveStoredProxyModels = (models: StoredProxyModel[]): void => {
    localStorage.setItem(PROXY_MODELS_KEY, JSON.stringify(models));
};
// -----------------------------------

export const getActiveModel = (): string => {
    const conn = getConnectionSettings();
    switch (conn.source) {
        case 'openrouter':
            return conn.openrouter_model || 'google/gemini-pro-1.5';
        case 'proxy':
            return conn.proxy_model || 'gemini-3-pro-preview';
        case 'gemini':
        default:
            return conn.gemini_model || 'gemini-3-flash-preview';
    }
};

export const setActiveModel = (modelId: string): void => {
    const conn = getConnectionSettings();
    const newConn = { ...conn };
    if (newConn.source === 'gemini') newConn.gemini_model = modelId;
    else if (newConn.source === 'proxy') newConn.proxy_model = modelId;
    else if (newConn.source === 'openrouter') newConn.openrouter_model = modelId;
    
    saveConnectionSettings(newConn);
};

export const getApiSettings = (): ApiSettings => {
    try {
        const storedSettings = localStorage.getItem(API_SETTINGS_KEY);
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            if (Array.isArray(parsed.keys)) {
                return { useDefault: parsed.useDefault ?? true, keys: parsed.keys };
            }
        }
    } catch (e) {
        console.error("Failed to parse API settings from localStorage", e);
    }
    return { useDefault: true, keys: [] };
};

export const saveApiSettings = (settings: ApiSettings): void => {
    localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(settings));
};

export const getApiKey = (): string | undefined => {
    const settings = getApiSettings();
    if (settings.useDefault) {
        return process.env.API_KEY;
    }
    const validKeys = settings.keys.filter(k => k.trim() !== '');
    if (validKeys.length === 0) {
        return process.env.API_KEY;
    }
    try {
        const lastIndexStr = localStorage.getItem(API_KEY_INDEX_KEY);
        const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;
        const nextIndex = (lastIndex + 1) % validKeys.length;
        localStorage.setItem(API_KEY_INDEX_KEY, String(nextIndex));
        return validKeys[nextIndex];
    } catch (e) {
        return validKeys[0];
    }
};

export const getOpenRouterApiKey = (): string => {
    return localStorage.getItem(OPENROUTER_API_KEY_KEY) || '';
};

export const saveOpenRouterApiKey = (key: string): void => {
    localStorage.setItem(OPENROUTER_API_KEY_KEY, key.trim());
};

export const getProxyUrl = (): string => {
    return localStorage.getItem(PROXY_URL_KEY) || DEFAULT_PROXY_URL;
};

export const saveProxyUrl = (url: string): void => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    localStorage.setItem(PROXY_URL_KEY, cleanUrl);
};

export const getProxyPassword = (): string => {
    return localStorage.getItem(PROXY_PASSWORD_KEY) || '';
};

export const saveProxyPassword = (password: string): void => {
    localStorage.setItem(PROXY_PASSWORD_KEY, password.trim());
};

export const getProxyLegacyMode = (): boolean => {
    const val = localStorage.getItem(PROXY_LEGACY_MODE_KEY);
    return val !== 'false';
};

export const saveProxyLegacyMode = (isLegacy: boolean): void => {
    localStorage.setItem(PROXY_LEGACY_MODE_KEY, String(isLegacy));
};

export const getProxyForTools = (): boolean => {
    return localStorage.getItem(PROXY_FOR_TOOLS_KEY) === 'true';
};

export const saveProxyForTools = (enabled: boolean): void => {
    localStorage.setItem(PROXY_FOR_TOOLS_KEY, String(enabled));
};

/**
 * EXPORT: Get all persistent settings from LocalStorage for backup.
 */
export const getAllLocalStorageData = (): Record<string, any> => {
    const data: Record<string, any> = {};
    const keys = [
        ACTIVE_MODEL_KEY, API_SETTINGS_KEY, API_KEY_INDEX_KEY, 
        OPENROUTER_API_KEY_KEY, PROXY_URL_KEY, PROXY_PASSWORD_KEY, 
        PROXY_LEGACY_MODE_KEY, PROXY_FOR_TOOLS_KEY, GLOBAL_CONNECTION_KEY,
        GLOBAL_SMART_SCAN_KEY, GLOBAL_CONTEXT_KEY, GLOBAL_TTS_KEY,
        PROXY_PROFILES_KEY, PROXY_MODELS_KEY // Added models for backup
    ];
    
    keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
    });
    
    return data;
};

/**
 * RESTORE: Apply settings back to LocalStorage.
 */
export const restoreLocalStorageData = (data: Record<string, any>): void => {
    Object.entries(data).forEach(([key, val]) => {
        if (typeof val === 'string') {
            localStorage.setItem(key, val);
        }
    });
};
