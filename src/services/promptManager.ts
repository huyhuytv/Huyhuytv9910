
import type { CharacterCard, SillyTavernPreset, Lorebook, WorldInfoEntry, ChatMessage, UserPersona, PromptSection, RpgSnapshot } from '../types';
import ejs from 'ejs';
import { get, applyVariableOperation } from './variableEngine';
import { resolveMedusaMacros, DEFAULT_MEDUSA_PROMPT, filterDatabaseForContext, getHybridDatabaseView, createRpgSnapshot } from './medusaService';
import { dispatchSystemLog } from './logBridge'; // Import logger

/**
 * Helper to filter active entries based on state and placement.
 */
const getActiveWorldInfoEntries = (
    card: CharacterCard, 
    worldInfoState?: Record<string, boolean>,
    activeEntriesOverride?: WorldInfoEntry[],
    worldInfoPlacement?: Record<string, 'before' | 'after' | undefined>
): { before: WorldInfoEntry[], after: WorldInfoEntry[] } => {
    let activeEntries: WorldInfoEntry[] = [];

    if (activeEntriesOverride) {
        activeEntries = [...activeEntriesOverride];
    } else {
        const allWorldEntries: WorldInfoEntry[] = [...(card.char_book?.entries || [])];
        activeEntries = allWorldEntries.filter(entry => {
            if (!entry.content || !entry.content.trim() || !entry.uid) return false;
            const isEnabledInCard = entry.enabled !== false;
            return worldInfoState ? (worldInfoState[entry.uid] ?? isEnabledInCard) : isEnabledInCard;
        });
    }

    // World Info still respects insertion_order for now as it's dynamic
    activeEntries.sort((a, b) => (a.insertion_order || 0) - (b.insertion_order || 0));
    
    const entriesBefore: WorldInfoEntry[] = [];
    const entriesAfter: WorldInfoEntry[] = [];

    activeEntries.forEach(entry => {
        const override = entry.uid && worldInfoPlacement ? worldInfoPlacement[entry.uid] : undefined;
        if (override === 'before') { entriesBefore.push(entry); return; }
        if (override === 'after') { entriesAfter.push(entry); return; }

        const pos = (entry.position || '').toLowerCase();
        if (pos.includes('after')) { entriesAfter.push(entry); } 
        else { entriesBefore.push(entry); }
    });

    return { before: entriesBefore, after: entriesAfter };
};

/**
 * Helper: Tính index mảng tin nhắn tương ứng với số lượt đã bỏ qua.
 * Dùng để xác định điểm bắt đầu của "Trang hiện tại" sau khi đã có các tóm tắt.
 */
const getMessageIndexFromTurns = (messages: ChatMessage[], turnsToSkip: number): number => {
    if (turnsToSkip <= 0) return 0;
    
    let currentTurnIndex = 0;
    
    for (let i = 0; i < messages.length; i++) {
        // Lượt 1 là tin nhắn đầu tiên (0). Các lượt sau kết thúc khi gặp role 'model'.
        const isTurnEnd = (i === 0) || (messages[i].role === 'model');
        
        if (isTurnEnd) {
            currentTurnIndex++;
            // Nếu đã đếm đủ số lượt cần bỏ qua
            if (currentTurnIndex === turnsToSkip) {
                // Điểm bắt đầu của trang mới là ngay sau tin nhắn kết thúc lượt này
                return i + 1;
            }
        }
    }
    
    // Nếu số lượt yêu cầu lớn hơn thực tế, trả về độ dài mảng (hết)
    return messages.length;
};

/**
 * Helper: Format RPG Database to Markdown Table string
 * NOTE: Excludes tables that have Live-Link enabled.
 */
const formatRpgData = (rpgData: any): string => {
    if (!rpgData || !rpgData.tables || !Array.isArray(rpgData.tables)) return '';
    
    let output = '';
    
    for (const table of rpgData.tables) {
        // Skip tables with no columns or missing config
        if (!table.config || !table.config.columns || table.config.columns.length === 0) continue;
        
        // Skip linked tables to avoid token duplication (Data is injected via World Info)
        if (table.config.lorebookLink?.enabled) continue;

        // Skip empty tables to save tokens
        if (!table.data || !table.data.rows || table.data.rows.length === 0) continue;
        
        output += `### ${table.config.name}\n`;
        
        // Markdown Table Header
        const headers = table.config.columns.map((c: any) => c.label);
        output += `| ${headers.join(' | ')} |\n`;
        output += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        // Markdown Table Body
        for (const row of table.data.rows) {
            // Row structure: [UUID, Col1, Col2...]
            // We skip UUID at index 0 for display
            const cells = row.slice(1).map((cell: any) => {
                if (cell === null || cell === undefined) return '';
                // Simple escape for pipes and newlines to keep table structure
                return String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>'); 
            });
            output += `| ${cells.join(' | ')} |\n`;
        }
        output += '\n';
    }
    
    return output.trim();
};

/**
 * Processes a string through the EJS engine with RECURSIVE support.
 */
const processEjsTemplate = async (
    template: string, 
    variables: Record<string, any>,
    card: CharacterCard,
    lorebooks: Lorebook[],
    depth: number = 0
): Promise<string> => {
    // Safety brake for recursion
    if (depth > 5) return ""; 
    
    if (!template) return '';

    // 1. Strip SillyTavern specific directives logic markers (aggressive cleanup)
    let cleanTemplate = template
        .replace(/^@@[a-z_]+.*$/gm, '') // Remove lines starting with @@
        .replace(/^\s*#.*$/gm, ''); // Remove lines starting with # (sometimes used for comments in WI)

    // If no EJS tags, return immediately (Macro replacement happens later)
    if (!cleanTemplate.includes('<%')) return cleanTemplate;

    // Helper to access variables safely
    const getvar = (path: string) => get(variables, path);

    // RECURSIVE getwi function
    // Supports polymorphism: getwi(key) OR getwi(book, key)
    const getwi = async (arg1: string | null, arg2?: string) => {
        // Normalize arguments
        let bookName: string | null = null;
        let entryKey: string = '';

        if (arg2 === undefined) {
            // Case: getwi('Key') -> arg1 is Key
            if (arg1) entryKey = arg1;
        } else {
            // Case: getwi('Book', 'Key') or getwi(null, 'Key')
            bookName = arg1;
            entryKey = arg2;
        }

        // console.log(`[EJS] getwi called. Book: ${bookName}, Key: ${entryKey}`);

        let allEntries: WorldInfoEntry[] = [];
        if (card.char_book?.entries) allEntries = [...allEntries, ...card.char_book.entries];
        lorebooks.forEach(lb => { 
            // Filter by bookName if provided
            if (bookName && lb.name !== bookName) return;
            if (lb.book?.entries) allEntries = [...allEntries, ...lb.book.entries]; 
        });

        const entry = allEntries.find(e => {
            // Robust matching: Check exact comment match OR key inclusion, case-insensitive if needed
            const commentMatch = e.comment && e.comment.trim() === entryKey;
            const keyMatch = e.keys && e.keys.includes(entryKey); 
            return commentMatch || keyMatch;
        });

        if (!entry) {
            return '';
        }

        // CRITICAL: Recursively render the content of the found entry
        return await processEjsTemplate(entry.content, variables, card, lorebooks, depth + 1);
    };

    try {
        // Render using EJS
        // CRITICAL FIX: Inject `stat_data` pointing to variables so V3 scripts accessing stat_data directly work.
        const context = { 
            getvar, 
            getwi, 
            char: card.name, 
            user: variables.user || 'User', // Ensure user name is available in EJS
            stat_data: variables, // Inject alias for V3 compatibility
            ...variables 
        };

        const rendered = await ejs.render(
            cleanTemplate, 
            context, 
            { async: true, rmWhitespace: true }
        );
        
        return rendered;
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`EJS Rendering Error (Depth ${depth}):`, errorMsg);
        // Return an error string so the user knows logic failed, rather than silently swallowing it
        return `[SYSTEM ERROR: EJS Processing Failed - ${errorMsg}]`; 
    }
};

/**
 * HELPER: Scans rendered text for lines that are actually Keys to other WI entries.
 * If found, replaces the key with that entry's content.
 * Solves the issue where Event Controllers output "Event_ID" and expect the system to fetch the event description.
 */
const expandKeysToContent = async (
    text: string, 
    variables: Record<string, any>,
    card: CharacterCard,
    lorebooks: Lorebook[]
): Promise<string> => {
    if (!text || !text.trim()) return text;

    const lines = text.split('\n');
    const processedLines = await Promise.all(lines.map(async (line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return line;

        // Gather all available entries
        let allEntries: WorldInfoEntry[] = [];
        if (card.char_book?.entries) allEntries = [...allEntries, ...card.char_book.entries];
        lorebooks.forEach(lb => { if (lb.book?.entries) allEntries = [...allEntries, ...lb.book.entries]; });

        // Check if this line exactly matches a Key or Comment of another entry
        const matchedEntry = allEntries.find(e => {
            const isKeyMatch = e.keys && e.keys.includes(cleanLine);
            const isCommentMatch = e.comment && e.comment === cleanLine;
            return (isKeyMatch || isCommentMatch) && !e.constant; // Don't expand constants to avoid infinite loops if they refer to themselves
        });

        if (matchedEntry) {
            // Found a match! Recursively render its content.
            // console.log(`[PromptManager] Auto-expanding key: "${cleanLine}" -> Entry Content`);
            return await processEjsTemplate(matchedEntry.content, variables, card, lorebooks);
        }

        return line;
    }));

    return processedLines.join('\n');
};

/**
 * CLEANS technical/mechanical content from a message string.
 * Removes: <thinking>, <UpdateVariable>, [CHOICE], StatusPlaceholders, and Code Blocks.
 * UPDATED: Also cleans <tableEdit>, <tableThink>, <tableCheck> for Integrated Mode.
 */
export const cleanMessageContent = (text: string): string => {
    if (!text) return '';
    return text
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '') // Remove Thinking blocks
        .replace(/<UpdateVariable(?:variable)?>[\s\S]*?<\/UpdateVariable(?:variable)?>/gi, '') // Remove Variable scripts
        .replace(/<LogicStore>[\s\S]*?<\/LogicStore>/gi, '') // Remove LogicStore
        .replace(/<VisualInterface>[\s\S]*?<\/VisualInterface>/gi, '') // Remove VisualInterface
        .replace(/<StatusPlaceHolderImpl\s*\/?>/gi, '') // Remove Status Bar placeholders
        .replace(/\[CHOICE:[\s\S]*?\]/gi, '') // Remove Choices (Case insensitive, handle multiline)
        .replace(/```[\s\S]*?```/g, '') // Remove Code blocks (mechanics/status)
        .replace(/<tableThink>[\s\S]*?<\/tableEdit>/gi, '') // Remove Mythic Engine Integrated Block
        .replace(/\n\s*\n/g, '\n') // Collapse extra newlines
        .trim();
};

/**
 * Prepares the basic structure of prompt sections.
 * Note: We NO LONGER inject World Info strings here. We just identify where they go.
 */
export function prepareChat(
    card: CharacterCard, 
    preset: SillyTavernPreset, 
    lorebooks: Lorebook[], 
    persona: UserPersona | null, 
    worldInfoState?: Record<string, boolean>,
    activeEntries?: WorldInfoEntry[],
    worldInfoPlacement?: Record<string, 'before' | 'after' | undefined>
): { baseSections: PromptSection[] } {
    
    // LOGIC CHANGE: Disabled sorting by injection_order.
    // Prompts are now mapped strictly in the order they appear in the preset's array.
    const sections: PromptSection[] = (preset.prompts || [])
        .filter(p => p.enabled === true && p.content)
        .map((p, index) => {
            return {
                id: p.identifier || `prompt_${index}`,
                name: p.name || 'Untitled Prompt',
                content: p.content, 
                role: p.role || 'system',
                // subSections will be populated later
            };
        });

    return { baseSections: sections };
}

/**
 * Constructs the full prompt string AND the structured sections.
 * Executes EJS logic for both Prompt Templates and World Info entries.
 */
export async function constructChatPrompt(
    baseSections: PromptSection[], 
    fullHistoryForThisTurn: ChatMessage[],
    authorNote: string,
    card: CharacterCard, 
    longTermSummaries: string[],
    chunkSizeTurns: number, // Renamed from pageSize for clarity
    variables: Record<string, any>,
    lastStateBlock: string, 
    lorebooks: Lorebook[] = [],
    contextMode: 'standard' | 'ai_only' = 'standard',
    userPersonaName: string = 'User',
    // Pass these to re-calculate WI inside async context
    worldInfoState?: Record<string, boolean>,
    activeEntriesOverride?: WorldInfoEntry[],
    worldInfoPlacement?: Record<string, 'before' | 'after' | undefined>,
    preset?: SillyTavernPreset
): Promise<{ fullPrompt: string, structuredPrompt: PromptSection[], rpgSnapshot?: RpgSnapshot }> { // Updated Return Type

    if (fullHistoryForThisTurn.length === 0) {
        throw new Error("Không thể tạo phản hồi cho một lịch sử trống.");
    }

    // DEBUG START
    dispatchSystemLog('log', 'system', `[PROMPT-DEBUG] Start constructing prompt. Variable count: ${Object.keys(variables).length}`);

    const history = fullHistoryForThisTurn.slice(0, -1);
    const userInput = fullHistoryForThisTurn[fullHistoryForThisTurn.length - 1].content;
    
    const allDefinitions = [
        card.description,
        card.personality,
        card.scenario,
        card.mes_example,
    ].filter(Boolean).join('\n\n');

    // --- HELPER: Identity Replacement ---
    // Centralized function to replace identity macros safely
    const replaceIdentityMacros = (text: string): string => {
        return text
            .replace(/{{char}}/gi, card.name || '')
            .replace(/{{user}}/gi, userPersonaName)
            .replace(/<user>/gi, userPersonaName) // Tawa support
            .replace(/{{user_input}}/gi, userInput)
            .replace(/{{prompt}}/gi, userInput);
    };

    // --- 1. Process World Info (Render -> Filter -> Format) ---
    // STEP 1: Get ALL active entries (including Mythic Live-Links)
    const { before, after } = getActiveWorldInfoEntries(card, worldInfoState, activeEntriesOverride, worldInfoPlacement);
    const wiFormat = preset?.wi_format || '[{{keys}}: {{content}}]';

    // --- MYTHIC HYBRID TABLE PREP (NEW - STEP 2) ---
    // We use the FULL set of active entries (including mythic_) to build the table context.
    // This allows the table to know which rows should be "Visible" (not dormant).
    let rpgHybridTableString = '';
    let rpgSnapshot: RpgSnapshot | undefined; // Store the snapshot here

    if (card.rpg_data) {
        // Filter DB based on active WI (Live-Link pruning)
        const allActiveEntries = [...before, ...after];
        const filteredDb = filterDatabaseForContext(card.rpg_data, allActiveEntries);
        // Generate View
        rpgHybridTableString = getHybridDatabaseView(filteredDb);
        // Generate Snapshot for Action Parsing
        rpgSnapshot = createRpgSnapshot(filteredDb);
    }
    // ------------------------------------

    // --- STEP 3: FILTER OUT LIVE-LINKS FOR WORLD INFO STRING ---
    // Now we remove 'mythic_*' entries from the lists that will be rendered into {{worldInfo}}.
    // This prevents duplication since they are already in the Table above.
    const cleanBefore = before.filter(e => !e.uid?.startsWith('mythic_'));
    const cleanAfter = after.filter(e => !e.uid?.startsWith('mythic_'));

    const processEntryList = async (entries: WorldInfoEntry[]): Promise<string[]> => {
        const results: string[] = [];
        for (const entry of entries) {
            // A. Render EJS first (Execute logic)
            // Inject User Name into Variables for EJS context
            const ejsVars = { ...variables, user: userPersonaName };
            let renderedContent = await processEjsTemplate(entry.content, ejsVars, card, lorebooks);
            
            // B. Auto-Expansion: If content is just an Event ID, fetch the real event content
            renderedContent = await expandKeysToContent(renderedContent, variables, card, lorebooks);

            // C. Filter: If result is empty/whitespace, discard it (Logic Controller)
            // UNLESS it is an error message we want to show for debugging
            if (!renderedContent || (!renderedContent.trim() && !renderedContent.includes('[SYSTEM ERROR'))) continue;
            
            // D. Replace Identity Macros in result
            renderedContent = replaceIdentityMacros(renderedContent);

            // E. Format: Apply the display format (e.g. [Key: Value])
            const formatted = wiFormat
                .replace(/{{keys}}/g, (entry.keys || []).join(', '))
                .replace(/{{content}}/g, renderedContent.trim());
            
            results.push(formatted);
        }
        return results;
    };

    // Processing clean lists (no mythic)
    const worldInfoBeforeList = await processEntryList(cleanBefore);
    const worldInfoAfterList = await processEntryList(cleanAfter);
    const worldInfoCombinedList = [...worldInfoBeforeList, ...worldInfoAfterList];

    const worldInfoBeforeString = worldInfoBeforeList.join('\n');
    const worldInfoAfterString = worldInfoAfterList.join('\n');
    const worldInfoCombinedString = worldInfoCombinedList.join('\n');

    // --- 2. Prepare Prompt Variables & RPG Data (MOVED AFTER WI PROCESSING) ---
    // Now that WI scripts have run, the 'variables' object is up-to-date.
    
    const formatVariablesForPrompt = (vars: Record<string, any>): string => {
        if (!vars || Object.keys(vars).length === 0) return '';
        const leanVars: Record<string, any> = {};
        function processObject(source: any, target: any) {
            for (const key in source) {
                if (key === '$meta') continue;
                const value = source[key];
                if (Array.isArray(value) && value.length > 1 && typeof value[1] === 'string') {
                    let mainValue = value[0];
                    if (Array.isArray(mainValue)) {
                        target[key] = mainValue.filter((item: any) => item !== '$__META_EXTENSIBLE__$');
                    } else {
                        target[key] = [mainValue];
                    }
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    target[key] = {};
                    processObject(value, target[key]);
                } else {
                    target[key] = value;
                }
            }
        }
        processObject(vars, leanVars);
        if (Object.keys(leanVars).length === 0) return '';
        return JSON.stringify(leanVars, null, 2);
    };

    const variablesStateString = formatVariablesForPrompt(variables);
    
    // --- MYTHIC ENGINE DATA PREP (FOR PLACEHOLDERS) ---
    const mythicStateString = formatRpgData(card.rpg_data);
    const mythicBlock = mythicStateString ? `<MythicDatabase>\n${mythicStateString}\n</MythicDatabase>` : '';
    // -------------------------------
    
    // --- INTEGRATED MODE PREP (NEW) ---
    let mythicIntegratedString = "";
    if (card.rpg_data?.settings?.executionMode === 'integrated' && card.rpg_data) {
        // Resolve Medusa Prompt using medusaService logic
        // Use filtered DB context (and pass implicit snapshot logic later)
        const filteredDb = filterDatabaseForContext(card.rpg_data, activeEntriesOverride || []);
        
        // Prepare context strings for macros
        const lorebookContext = [...worldInfoCombinedList].join('\n');
        
        const rawSystemPrompt = card.rpg_data.settings.customSystemPrompt || DEFAULT_MEDUSA_PROMPT;
        
        mythicIntegratedString = resolveMedusaMacros(rawSystemPrompt, filteredDb, "", lorebookContext);
    }
    // ----------------------------------

    let smartStateString = '';
    const stateParts: string[] = [];
    if (variablesStateString) stateParts.push(`<LogicStore>\n${variablesStateString}\n</LogicStore>`);
    if (mythicBlock) stateParts.push(mythicBlock);
    if (lastStateBlock) stateParts.push(`<VisualInterface>\n${lastStateBlock}\n</VisualInterface>`);
    
    smartStateString = stateParts.join('\n\n');

    // --- 3. Prepare Context Strings & Lists ---
    
    // Tầng 3: Trí nhớ Dài hạn
    const longTermSummaryString = longTermSummaries.length > 0 
        ? `${longTermSummaries.join('\n\n---\n\n')}`
        : "Đây là khởi đầu của cuộc trò chuyện.";

    // TÍNH TOÁN LẠI ĐIỂM CẮT DỰA TRÊN SỐ LƯỢT (Turn-based slicing)
    const totalTurnsCovered = longTermSummaries.length * chunkSizeTurns;
    
    // Sử dụng helper để tìm index mảng tin nhắn tương ứng với số lượt đã tóm tắt
    const startIndexForCurrentPage = getMessageIndexFromTurns(history, totalTurnsCovered);
    
    let currentPageMessages = history.slice(startIndexForCurrentPage);
    
    if (contextMode === 'ai_only') {
        currentPageMessages = currentPageMessages.filter(msg => msg.role === 'model' || msg.role === 'system');
    }

    // HELPER: Get meaningful text content (fallback to raw if display is empty)
    const getMessageContent = (msg: ChatMessage) => {
        if (msg.content && msg.content.trim()) return msg.content;
        // Fallback for interactive cards where content is empty but originalRawContent exists
        return msg.originalRawContent || '';
    };

    // Tầng 2: Trí nhớ Ngắn hạn (Lịch sử trang này)
    const currentPageHistoryList = currentPageMessages.map(msg => {
        // Get content
        const rawText = getMessageContent(msg);
        // Apply cleaning specifically for history injection
        const cleanText = cleanMessageContent(rawText);
        // Apply macros
        const content = replaceIdentityMacros(cleanText);
        
        if (!content.trim()) return null; // Skip empty lines after cleaning

        if (msg.role === 'user') return `${userPersonaName}: ${content}`;
        if (msg.role === 'system') return `System: ${content}`;
        return `${card.name}: ${content}`;
    }).filter(Boolean) as string[];
    
    if (currentPageHistoryList.length === 0) {
        currentPageHistoryList.push(contextMode === 'ai_only' ? "Bắt đầu phần tự thuật mới." : "Bắt đầu trang hội thoại mới.");
    }
    const currentPageHistoryString = currentPageHistoryList.join('\n');

    // Tầng 1: Ngữ cảnh Tức thời (Lượt gần nhất)
    const lastTurnList: string[] = [];
    
    const contextForLastTurn = history; 
    let lastModelIndex = -1;

    // 1. Tìm tin nhắn AI (Model) cuối cùng trong lịch sử
    for (let i = contextForLastTurn.length - 1; i >= 0; i--) {
        if (contextForLastTurn[i].role === 'model') {
            lastModelIndex = i;
            break;
        }
    }

    if (lastModelIndex !== -1) {
        // 2. Tìm điểm bắt đầu của lượt này (User message liền trước Model đó)
        let startOfTurnIndex = lastModelIndex;
        
        for (let i = lastModelIndex - 1; i >= 0; i--) {
            const role = contextForLastTurn[i].role;
            if (role === 'user') {
                startOfTurnIndex = i;
                if (i > 0 && contextForLastTurn[i-1].role === 'model') break;
            } else if (role === 'model') {
                break;
            }
        }

        const relevantMsgs = contextForLastTurn.slice(startOfTurnIndex, lastModelIndex + 1);
        
        relevantMsgs.forEach(msg => {
             const rawText = getMessageContent(msg);
             const content = replaceIdentityMacros(rawText);
             
             if (content.trim()) {
                 const role = msg.role === 'user' ? userPersonaName : card.name;
                 lastTurnList.push(`${role}: ${content}`);
             }
        });
    } else {
        lastTurnList.push("Chưa có lượt nào gần đây.");
    }

    const lastTurnString = lastTurnList.join('\n');
    
    // --- 4. Assemble & Render Prompt Sections ---
    
    const resolvedSections: PromptSection[] = [];
    
    for (const section of baseSections) {
        let content = section.content;
        
        let subSections: string[] | undefined = undefined;
        const addToSubSections = (list: string[]) => {
            if (!subSections) subSections = [];
            subSections.push(...list);
        };

        if (content.includes('{{worldInfo_before}}')) addToSubSections(worldInfoBeforeList);
        if (content.includes('{{worldInfo_after}}')) addToSubSections(worldInfoAfterList);
        if (content.includes('{{worldInfo}}')) addToSubSections(worldInfoCombinedList);
        
        if (content.includes('{{long_term_summary}}')) addToSubSections(longTermSummaries.length > 0 ? longTermSummaries : ["Chưa có tóm tắt dài hạn."]);
        if (content.includes('{{current_page_history}}')) addToSubSections(currentPageHistoryList);
        if (content.includes('{{last_turn}}')) addToSubSections(lastTurnList);

        // --- PIPELINE ORDER (Optimized for Variable Logic & Identity) ---
        
        // 1. PRE-REPLACE IDENTITY (Crucial for setvar/addvar logic using names)
        content = replaceIdentityMacros(content);

        // 2. Comments {{//...}} or {{#...}} - Remove them
        content = content.replace(/{{(\/\/|#).*?}}/gi, '');

        // 3. Trim Macro {{trim}} - Remove surrounding whitespace
        content = content.replace(/\s*{{trim}}\s*/gi, '');

        // 4. Roll/Random Macros (Moved UP so they can be used in addvar)
        const rollHandler = (_: string, countStr: string, sidesStr: string, modStr: string) => {
            const count = countStr ? parseInt(countStr, 10) : 1; 
            const sides = parseInt(sidesStr, 10);
            let total = 0;
            for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
            if (modStr) total += parseInt(modStr.replace(/\s/g, ''), 10);
            return String(total);
        };
        content = content.replace(/{{dice:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollHandler)
                         .replace(/{{roll:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollHandler)
                         .replace(/{{random:(.*?)}}/gi, (_, c) => {
                             const args = c.split(',');
                             return args[Math.floor(Math.random() * args.length)].trim();
                         });

        // 5. Add Variable Macro {{addvar::key::val}}
        // FIX: Added multiline support via [\s\S]*?
        content = content.replace(/{{addvar::([^:]+)::([\s\S]*?)}}/gi, (_, key, val) => {
            const cleanKey = key.trim();
            const cleanVal = val.trim();
            
            // Try parsing as number if applicable
            const numVal = Number(cleanVal);
            const finalVal = (cleanVal !== '' && !isNaN(numVal)) ? numVal : cleanVal;

            // DEBUG LOGGING
            dispatchSystemLog('log', 'variable', `[PROMPT-DEBUG] Found addvar: Key="${cleanKey}", Val="${cleanVal}" (Parsed: ${finalVal})`);

            variables = applyVariableOperation(variables, 'add', cleanKey, finalVal);
            return '';
        });

        // 6. Set Global Variable
        // FIX: Added multiline support via [\s\S]*?
        content = content.replace(/{{setglobalvar::([^:]+)::([\s\S]*?)}}/gi, (_, key, val) => {
            const cleanKey = key.trim();
            const cleanVal = val.trim();
            const numVal = Number(cleanVal);
            const finalVal = (cleanVal !== '' && !isNaN(numVal)) ? numVal : cleanVal;

            variables = applyVariableOperation(variables, 'set', 'globals.' + cleanKey, finalVal);
            return ''; 
        });

        // 7. Set Variable
        // FIX: Added multiline support via [\s\S]*?
        content = content.replace(/{{setvar::([^:]+)::([\s\S]*?)}}/gi, (_, key, val) => {
            const cleanKey = key.trim();
            const cleanVal = val.trim();
            const numVal = Number(cleanVal);
            const finalVal = (cleanVal !== '' && !isNaN(numVal)) ? numVal : cleanVal;

            dispatchSystemLog('log', 'variable', `[PROMPT-DEBUG] Found setvar: Key="${cleanKey}", Val="${cleanVal}"`);
            variables = applyVariableOperation(variables, 'set', cleanKey, finalVal);
            return ''; 
        });

        // 8. Get Variable (Display)
        content = content.replace(/{{getvar::([^}]+)}}/gi, (_, path) => {
            const cleanPath = path.trim();
            const val = get(variables, cleanPath);
            
            // DEBUG LOGGING
            dispatchSystemLog('log', 'variable', `[PROMPT-DEBUG] Executing getvar: "${cleanPath}" -> Result: ${val}`);
            
            return val !== undefined ? String(val) : '';
        });
        
        content = content.replace(/{{getglobalvar::([^}]+)}}/gi, (_, key) => {
            const cleanKey = key.trim();
            const val = get(variables, 'globals.' + cleanKey);
            return val !== undefined ? String(val) : '';
        });

        // -----------------------------------------------

        content = content
            .replace(/{{worldInfo_before}}/g, worldInfoBeforeString)
            .replace(/{{worldInfo_after}}/g, worldInfoAfterString)
            .replace(/{{worldInfo}}/g, worldInfoCombinedString)
            // Run standard replacements again just in case new tokens were introduced
            .replace(/{{char}}/g, card.name || '')
            .replace(/{{user}}/g, userPersonaName)
            .replace(/<user>/g, userPersonaName)
            .replace(/{{smart_state_block}}/g, smartStateString)
            .replace(/{{current_variables_state}}/g, variablesStateString)
            .replace(/{{mythic_database}}/g, mythicStateString) 
            .replace(/{{rpg_hybrid_table}}/g, rpgHybridTableString) // NEW: Hybrid Table Macro
            .replace(/{{mythic_instruction_block}}/g, mythicIntegratedString) 
            .replace(/{{last_state}}/g, lastStateBlock)
            .replace(/{{author_note}}/g, authorNote || '')
            .replace(/{{long_term_summary}}/g, longTermSummaryString)
            .replace(/{{current_page_history}}/g, currentPageHistoryString)
            .replace(/{{last_turn}}/g, lastTurnString)
            .replace(/{{user_input}}/g, userInput)
            .replace(/{{prompt}}/g, userInput)
            .replace(/{{get_message_variable::([^}]+)}}/gi, (_, path) => {
                const cleanPath = path.trim();
                const val = get(variables, cleanPath);
                if (val === undefined) return '';
                return typeof val === 'object' ? JSON.stringify(val) : String(val);
            })
            .replace(/{{all_definitions}}/g, allDefinitions)
            .replace(/{{description}}/g, card.description)
            .replace(/{{personality}}/g, card.personality)
            .replace(/{{scenario}}/g, card.scenario)
            .replace(/{{mes_example}}/g, card.mes_example);

        // Run EJS with updated variables containing User Name
        const ejsVars = { ...variables, user: userPersonaName };
        content = await processEjsTemplate(content, ejsVars, card, lorebooks);
        
        // Final Identity Replace for any tokens output by EJS
        content = replaceIdentityMacros(content);

        content = content.trim();
        
        if (content) {
            resolvedSections.push({ ...section, content, subSections });
        }
    }

    const fullPrompt = resolvedSections.map(s => s.content).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    
    return { fullPrompt, structuredPrompt: resolvedSections, rpgSnapshot }; // Return snapshot
}
