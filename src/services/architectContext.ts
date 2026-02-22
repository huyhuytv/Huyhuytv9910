
// File này chứa nội dung mã nguồn của hệ thống để gửi cho AI Architect.
// Được cập nhật dựa trên phiên bản mã nguồn hiện tại.

export const CONTEXT_FILES = {
    types: `
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

export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    content: string;
    interactiveHtml?: string;
    originalRawContent?: string;
    contextState?: Record<string, any>;
}

export interface WorldInfoEntry {
  id?: number;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: string;
  use_regex?: boolean;
  extensions?: Record<string, any>;
  sticky?: number;
  cooldown?: number;
  uid?: string;
}

export interface CharacterBook {
  entries: WorldInfoEntry[];
  name?: string;
}

export interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings?: string[];
  placement?: number[];
  disabled: boolean;
  markdownOnly?: boolean;
  promptOnly?: boolean;
  runOnEdit?: boolean;
  substituteRegex?: number;
  minDepth?: number | null;
  maxDepth?: number | null;
}

export interface TavernHelperScript {
    type: 'script';
    value: {
        id: string;
        name: string;
        content: string;
        info?: string;
        buttons?: {name: string, visible: boolean}[];
        data?: Record<string, any>;
        enabled: boolean;
    };
}

export interface CharacterCard {
  name: string;
  description: string;
  personality?: string;
  first_mes: string;
  mes_example: string;
  scenario?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  alternate_greetings?: string[];
  char_book?: CharacterBook;
  extensions?: {
    TavernHelper_scripts?: TavernHelperScript[];
    regex_scripts?: RegexScript[];
    [key: string]: any;
  };
  [key: string]: any;
}
`,
    stScriptEngine: `
// Slash Command Engine Logic
// Supported Commands:
// /echo [msg] - Show toast
// /send [msg] - Send as user
// /sys [msg] - System message
// /set var=val - Set variable
// /get var - Debug variable
// /add, /sub, /mul, /div - Math ops
// /length target source - Get string/array length
// /concat target v1 v2 - Concatenate strings
// /if, /elseif, /else, /endif - Flow control
// /wait ms - Delay
// /lock, /unlock - Lock input
// /input text - Set input box text
// /qr label|label - Set quick replies
// /buttons "Label" /command | ... - Set script buttons
// /bg url - Set background
// /music url - Set music
// /sound url - Play sfx
`,
    variableEngine: `
// Variable Engine Logic (Hybrid Lodash Sandbox)
// Handles variable storage, retrieval, and updates via scripts (<UpdateVariable>)
// Supports Tuple unwrapping: [value, type] -> value is used for logic.
// Sandbox includes:
// - variables: The current state object (often aliased as 'stat_data')
// - _: Hybrid Lodash instance with custom methods:
//    - _.set(path, val): Deep set
//    - _.get(path): Deep get
//    - _.add/sub/mul/div(path, val): Math
//    - _.push/insert(path, val): Array push
//    - _.remove(path, val): Array remove
//    - _.assign(path, key, val) or _.assign(path, val): Object assign or Array push
`,
    regexService: `
// Regex Script Processor
// 1. Harvest: Extracts HTML/Script blocks from raw text (Output mode) to preserve them.
// 2. Decorate: Runs regex replacements defined in card.extensions.regex_scripts.
// 3. Restore: If output mode, checks if interactive HTML is present or needs recovery.
// 4. Returns: displayContent (sanitized text) and interactiveHtml (raw HTML/JS for iframe).
`,
    interactiveHtmlMessage: `
// Interactive Iframe Container
// This component renders the 'interactiveHtml' content in a sandboxed iframe.
// It provides a 'bootstrapScript' environment mimicking SillyTavern:
// - window.ST: Global API mock
// - window.getvar(path): Access variables
// - window.setvar(key, val): Update variables
// - window.getwi(book, key): Access world info
// - window.executeSlashCommands(cmd): Run slash commands back to parent
// - window.eventEmit/eventOn: Event bus
// - Standard libraries injected: jQuery, Lodash, EJS, marked, etc.
`
};

export const DEFAULT_ARCHITECT_PROMPT = `Bạn là **AI Studio Architect** - Kỹ sư trưởng và Chuyên gia tối ưu hóa cho hệ thống 'Card Studio'.
Nhiệm vụ của bạn: Phân tích thẻ nhân vật được cung cấp và đưa ra giải pháp mã hóa (Coding Solution) tối ưu nhất để nó hoạt động hoàn hảo trên Engine của chúng tôi.

**1. TÀI LIỆU KỸ THUẬT (ENGINE CONTEXT):**
Dưới đây là tóm tắt mã nguồn cốt lõi của hệ thống. Bạn PHẢI tuân thủ các type, hàm và logic trong này:
{{app_source_code}}

**2. DỮ LIỆU THẺ NHÂN VẬT (INPUT):**
- Tên: {{card_name}}
- Kịch bản TavernHelper: 
\`\`\`json
{{card_script_tavern}}
\`\`\`
- Kịch bản Regex: 
\`\`\`json
{{card_script_regex}}
\`\`\`
- Lời chào đầu (Khởi tạo biến): 
\`\`\`text
{{card_first_mes}}
\`\`\`
- Các mục Sổ tay liên quan (Context): 
\`\`\`json
{{card_lorebook_selected}}
\`\`\`

**3. YÊU CẦU CỦA NGƯỜI DÙNG:**
{{user_instruction}}

**YÊU CẦU ĐẦU RA:**
- Đóng vai một nhà tư vấn kỹ thuật cao cấp.
- Phân tích vấn đề tiềm ẩn (ví dụ: dùng syntax cũ, xung đột biến, regex sai, logic JS trong thẻ không tương thích với sandbox).
- Đề xuất giải pháp cụ thể (viết lại script, sửa regex, tối ưu biến).
- Nếu cần viết mã, hãy viết mã hoàn chỉnh, bọc trong block code, sẵn sàng để copy-paste.
- Luôn ưu tiên sử dụng cú pháp chuẩn của hệ thống (ví dụ: dùng \`window.getvar\` thay vì truy cập trực tiếp biến toàn cục nếu có thể).
`;
