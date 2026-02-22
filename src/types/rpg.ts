
// --- MYTHIC ENGINE: RPG DATA STRUCTURES (V2 - OPTIMIZED) ---

export type RPGColumnType = 'string' | 'number' | 'boolean' | 'list';

export interface RPGColumn {
    id: string;           // Key định danh (ví dụ: 'current_hp'). Dùng để map dữ liệu.
    label: string;        // Tên hiển thị (ví dụ: 'Máu Hiện Tại').
    type: RPGColumnType;  // Kiểu dữ liệu.
    description?: string; // Gợi ý cho AI hiểu cột này là gì.
}

export interface RPGExportConfig {
    // Có bật tính năng bơm vào Chat không?
    enabled: boolean;
    
    // Định dạng hiển thị
    format?: 'markdown_table' | 'json_array' | 'compact_list' | 'text_summary';
    
    // Chiến lược bơm dữ liệu
    strategy?: 'always' | 'on_change' | 'never';
    
    // --- CÁC TRƯỜNG NÂNG CAO TỪ LEGACY V2 ---
    splitByRow?: boolean; // Có tách từng dòng thành các entry riêng biệt không?
    entryName?: string;   // Tên định danh cho entry (ví dụ: "Địa điểm")
    entryType?: 'constant' | 'keyword' | 'random'; // Loại entry
    keywords?: string;    // Từ khóa kích hoạt (dạng chuỗi phân tách dấu phẩy)
    preventRecursion?: boolean; // Chống đệ quy (không quét lại nội dung đã bơm)
    injectionTemplate?: string; // Template tùy chỉnh (nếu có)
    injectIntoWorldbook?: boolean; // Có bơm vào Worldbook ảo không?
}

// NEW: Cấu hình liên kết Lorebook
export interface LorebookLinkConfig {
    enabled: boolean;
    keyColumnId: string; // ID của cột dùng làm Từ khóa (Key)
}

export interface RPGTableConfig {
    id: string;           // ID bảng (ví dụ: 'inventory')
    name: string;         // Tên hiển thị
    description?: string; // Mô tả bảng (note)
    
    columns: RPGColumn[]; // Định nghĩa cấu trúc cột
    
    export: RPGExportConfig; // Cấu hình xuất dữ liệu sang Chat
    
    // Cấu hình liên kết Lorebook (Live-Link)
    lorebookLink?: LorebookLinkConfig;

    // Luật vận hành cho Medusa (Core Logic)
    aiRules?: {
        update?: string; // Khi nào cập nhật?
        insert?: string; // Khi nào thêm mới?
        delete?: string; // Khi nào xóa?
        init?: string;   // Khi khởi tạo?
    };
    
    // Thứ tự hiển thị
    orderNo?: number;
}

export interface RPGTableData {
    // Dữ liệu hàng dạng Mảng 2 chiều để tiết kiệm Token.
    // Cấu trúc: [RowUUID, ValueCol1, ValueCol2, ...]
    // RowUUID luôn ở Index 0.
    // ValueCol1 tương ứng với columns[0], ValueCol2 tương ứng columns[1]...
    rows: any[][]; 
}

export interface RPGTable {
    config: RPGTableConfig; // Schema & Rules
    data: RPGTableData;     // Actual Values
}

// --- NEW SETTINGS INTERFACE ---
export interface RPGSettings {
    // 1. Vận hành (Operation)
    modelId?: string; // ID model riêng (nếu undefined thì dùng mặc định của app)
    triggerMode: 'auto' | 'manual' | 'keyword';
    executionMode?: 'standalone' | 'integrated'; // NEW: Standalone (2-pass) vs Integrated (1-pass)
    triggerKeywords?: string[]; // Dùng cho mode 'keyword'

    // 2. Lời nhắc (Prompt Engineering)
    customSystemPrompt?: string; // Lời nhắc tùy chỉnh cho Medusa

    // 3. Ngữ cảnh (Context) - NEW
    pinnedLorebookUids?: string[]; // Danh sách UID của các mục Lorebook được ghim (luôn gửi)
}

export interface RPGDatabase {
    version: number;            
    tables: RPGTable[];         
    globalRules?: string;       // Luật chung (Global Game Rules)
    lastUpdated?: number;       
    settings?: RPGSettings;     // Cấu hình nâng cao
}

// --- SNAPSHOT SYSTEM (Fix Index Shifting) ---
// Index 0: Table Index.
// Index 1: Array of Row UUIDs visible to AI at that time.
export type RpgSnapshot = string[][];

// --- MEDUSA ACTIONS ---
// AI trả về JSON này để thao tác dữ liệu
export interface MedusaAction {
    type: 'INSERT' | 'UPDATE' | 'DELETE' | 'NOTIFY';
    tableId?: string;
    tableIndex?: number; // Index of table in DB.tables array
    
    // Dùng cho UPDATE/DELETE
    rowId?: string; 
    rowIndex?: number; // Index of row in table.data.rows array
    
    // Dùng cho UPDATE: { "column_id": value }
    // Dùng cho INSERT: { "column_id": value, ... }
    data?: Record<string, any>; 
    
    message?: string; 
}

// --- MEDUSA RESULTS (NEW) ---
export interface MedusaSuccessResult {
    success: true;
    newDb: RPGDatabase;
    notifications: string[];
    logs: string[];
    rawActions: MedusaAction[];
    debugInfo?: {
        prompt: string;
        rawResponse: string;
    };
}

export interface MedusaErrorResult {
    success: false;
    error: string;
    logs: string[];
    debugInfo?: {
        prompt: string;
        rawResponse: string;
    };
}

export type MedusaResult = MedusaSuccessResult | MedusaErrorResult;
