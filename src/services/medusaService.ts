
import { GoogleGenAI } from "@google/genai";
import type { RPGDatabase, MedusaAction, MedusaResult, RpgSnapshot } from '../types/rpg';
import type { WorldInfoEntry } from '../types';
import { parseLooseJson } from '../utils';
import { getConnectionSettings, getProxyForTools } from './settingsService';
import { callOpenAIProxyTask } from './api/proxyApi';

export const DEFAULT_MEDUSA_PROMPT = `
Bạn là một Medusa chuyên điền bảng biểu. Bạn cần tham khảo bối cảnh thiết lập trước đó cũng như <Dữ liệu chính văn> được gửi cho bạn để ghi lại dưới dạng bảng. 

Bạn cần:
1. Đọc <Dữ liệu bảng (Hybrid)> để hiểu cấu trúc và trạng thái hiện tại.
2. Tham khảo <Dữ liệu tham khảo> (nếu có) để hiểu các quy tắc thế giới, vật phẩm và chỉ số.
3. Thực hiện sửa đổi (Thêm/Sửa/Xóa) để phản ánh diễn biến mới nhất.

Đầu ra cuối cùng của bạn phải là định dạng văn bản thuần túy, tuân thủ nghiêm ngặt thứ tự <tableThink>, <tableCheck>, <tableEdit>. Bắt đầu trực tiếp bằng thẻ <tableThink> và kết thúc bằng thẻ </tableEdit>. Hướng dẫn điền cụ thể như sau:

## 《Hướng dẫn điền bảng dữ liệu》

<tableThink> (Khối suy nghĩ về bảng):
Chức năng: Chứa nội dung phân tích của AI, quá trình suy nghĩ để quyết định thao tác bảng. Mọi nội dung suy nghĩ phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.

Tóm tắt cốt truyện: Trước tiên, phải viết một bản tóm tắt cốt truyện hoàn chỉnh dựa trên dữ liệu chính văn do người dùng cung cấp. Lưu ý đặc biệt là người dùng có thể gửi nhiều lượt đối thoại, tóm tắt phải bao quát tất cả cốt truyện chính văn.

Nội dung tóm tắt: Mô tả đơn giản và đầy đủ toàn bộ cốt truyện diễn ra trong chính văn, bao gồm các thông tin có sự thay đổi.

Nắm bắt thay đổi: Tập trung vào trôi qua của thời gian, chuyển dịch địa điểm, thay đổi trạng thái/trải nghiệm/quan hệ của nhân vật, thu thập/tiêu hao vật phẩm, cập nhật tiến độ nhiệm vụ, v.v.

Ánh xạ chỉ mục bảng (Bước then chốt):
- Đọc kỹ phần <Dữ liệu bảng (Hybrid)>. Mỗi bảng bắt đầu bằng [[DB_TABLE_Index]].
- Bạn phải trích xuất con số Index này làm tableIndex cho các lệnh.
- Ví dụ: Nếu tiêu đề là [[DB_TABLE_4]] Túi đồ -> tableIndex là 4.

Quyết định thao tác: Sau khi hoàn thành tóm tắt, dựa vào các quy tắc [Luật] trong bảng, phân tích xem cần thực hiện insertRow, updateRow hay deleteRow.

<tableCheck> (Khối kiểm tra các mục quan trọng):
Chức năng: Sau khi suy nghĩ chính, trước khi thực hiện lệnh, tiến hành kiểm tra cuối cùng các nhiệm vụ quan trọng. Mọi nội dung kiểm tra phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.

Xác nhận khởi tạo: Kiểm tra dữ liệu hiện tại trong mảng DATA xem có trống không. Nếu trống và luật cho phép, hãy khởi tạo.
Xác nhận chỉ mục: Kiểm tra lại xem tableIndex có khớp với tiêu đề [[DB_TABLE_X]] không.
Tính nhất quán: Đảm bảo dữ liệu logic với câu chuyện (ví dụ: HP không được âm trừ khi chết).

<tableEdit> (Khối lệnh chỉnh sửa bảng):
Chức năng: Chứa các lệnh thao tác thực tế để cập nhật dữ liệu bảng (insertRow, updateRow, deleteRow). Mọi lệnh phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.

Cú pháp lệnh <tableEdit> (Tuân thủ nghiêm ngặt):

Loại thao tác: Chỉ giới hạn deleteRow, insertRow, updateRow.

Định dạng tham số:
tableIndex (Số thứ tự bảng): Lấy từ [[DB_TABLE_Index]].
rowIndex (Số thứ tự hàng): Là chỉ số của mảng trong khối DATA (bắt đầu từ 0).
colIndex (Số thứ tự cột): Là chuỗi ký tự chỉ số cột ("0", "1", "2"...) tương ứng với phần SCHEMA.

Ví dụ lệnh:
Chèn: insertRow(4, {"1": "Kiếm gỗ", "2": 1}) (Chèn vào bảng 4, Cột 1 là Kiếm gỗ, Cột 2 là 1)
Cập nhật: updateRow(4, 0, {"2": 5}) (Cập nhật bảng 4, hàng 0, cột 2 thành 5)
Xóa: deleteRow(4, 0) (Xóa hàng 0 của bảng 4)

-- CONTEXT --
<Dữ liệu bảng (Hybrid)>
{{rpg_hybrid_table}}
</Dữ liệu bảng (Hybrid)>

<Dữ liệu tham khảo (Lorebook)>
{{rpg_lorebook}}
</Dữ liệu tham khảo (Lorebook)>

<Dữ liệu chính văn>
{{chat_history}}
</Dữ liệu chính văn>

LUẬT CHUNG:
{{global_rules}}
`;

const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

// --- HELPER FUNCTIONS ---

const getDatabaseSchema = (db: RPGDatabase): string => {
    let output = "";
    
    db.tables.forEach((table, tableIndex) => {
        const { config } = table;
        output += `### [${tableIndex}:${config.name}]\n`;
        output += `  DESC: ${config.description || 'N/A'}\n`;
        
        if (config.aiRules) {
            if (config.aiRules.init) output += `  [Điều kiện Khởi tạo]: ${config.aiRules.init}\n`;
            if (config.aiRules.update) output += `  [Điều kiện Cập nhật]: ${config.aiRules.update}\n`;
            if (config.aiRules.insert) output += `  [Điều kiện Thêm mới]: ${config.aiRules.insert}\n`;
            if (config.aiRules.delete) output += `  [Điều kiện Xóa]: ${config.aiRules.delete}\n`;
        }

        const schemaStr = config.columns.map((c, colIdx) => `["${colIdx}"] ${c.label} (${c.type})`).join(', ');
        output += `  [Mô tả cột (Schema)]: ${schemaStr}\n`;
        output += "\n";
    });

    return output;
};

const getDatabaseData = (db: RPGDatabase): string => {
    let output = "";
    
    db.tables.forEach((table, tableIndex) => {
        const { config, data } = table;
        
        output += `### [${tableIndex}:${config.name}]\n`;
        output += `  DATA (Rows):\n`;
        
        if (!data.rows || data.rows.length === 0) {
            output += `    (Trống - Cần khởi tạo)\n`;
        } else {
            data.rows.forEach((row, rowIdx) => {
                const values = row.slice(1).map((v, i) => `"${i}":${JSON.stringify(v)}`).join(', ');
                output += `    Row ${rowIdx}: { ${values} }\n`;
            });
        }
        output += "\n";
    });

    return output;
};

// --- NEW: Hybrid View Function (JSON-Lines Block) ---
export const getHybridDatabaseView = (db: RPGDatabase): string => {
    let output = "";

    db.tables.forEach((table, tableIndex) => {
        const { config, data } = table;

        // 1. Block Header
        output += `[[DB_TABLE_${tableIndex}]] ${config.name}\n`;

        // 2. Description
        if (config.description) {
            output += `> MÔ TẢ: ${config.description}\n`;
        }

        // 3. Rules
        const rules: string[] = [];
        if (config.aiRules?.init) rules.push(`[Init: ${config.aiRules.init}]`);
        if (config.aiRules?.insert) rules.push(`[Insert: ${config.aiRules.insert}]`);
        if (config.aiRules?.update) rules.push(`[Update: ${config.aiRules.update}]`);
        if (config.aiRules?.delete) rules.push(`[Delete: ${config.aiRules.delete}]`);

        if (rules.length > 0) {
            output += `> LUẬT: ${rules.join(' ')}\n`;
        }

        // 4. Schema (Index Mapping)
        output += `> SCHEMA (Cấu trúc cột):\n`;
        // Removed UUID display (0) to align visual index with data index for AI
        config.columns.forEach((col, idx) => {
            output += `  ["${idx}"] ${col.label} (${col.type})\n`;
        });

        // 5. Data (JSON Array)
        output += `> DATA (Mảng dữ liệu):\n`;
        if (!data.rows || data.rows.length === 0) {
             output += `  (Trống - Cần khởi tạo)\n`;
        } else {
            // Opening array bracket
            output += `[\n`;
            // Map rows to JSON strings, SLICING off the first element (UUID) so index 0 corresponds to Column 0
            const jsonRows = data.rows.map(row => `  ${JSON.stringify(row.slice(1))}`);
            output += jsonRows.join(',\n');
            // Closing array bracket
            output += `\n]\n`;
        }

        output += "\n";
    });

    return output;
};

// --- NEW: Create Snapshot (Extract UUIDs from Filtered DB) ---
export const createRpgSnapshot = (db: RPGDatabase): RpgSnapshot => {
    const snapshot: RpgSnapshot = [];
    
    db.tables.forEach(table => {
        const rowUids: string[] = [];
        if (table.data.rows) {
            table.data.rows.forEach(row => {
                if (row.length > 0) {
                    rowUids.push(row[0]); // UUID is always at index 0
                }
            });
        }
        snapshot.push(rowUids);
    });

    return snapshot;
};

export const resolveMedusaMacros = (prompt: string, db: RPGDatabase, historyLog: string, lorebookContext: string): string => {
    const schemaStr = getDatabaseSchema(db);
    const dataStr = getDatabaseData(db);
    const hybridStr = getHybridDatabaseView(db); // NEW: Inject Hybrid View
    const globalRules = db.globalRules || "";
    
    const lastUserLineMatch = historyLog.match(/User: (.*)$/m);
    const lastUserInput = lastUserLineMatch ? lastUserLineMatch[1] : "";

    return prompt
        .replace('{{rpg_schema}}', schemaStr)
        .replace('{{rpg_data}}', dataStr)
        .replace('{{rpg_hybrid_table}}', hybridStr) // NEW: Inject Hybrid View
        .replace('{{rpg_lorebook}}', lorebookContext)
        .replace('{{global_rules}}', globalRules)
        .replace('{{chat_history}}', historyLog)
        .replace('{{last_user_input}}', lastUserInput);
};

// Filter database for context - Only include rows that match Active Live-Links
export const filterDatabaseForContext = (db: RPGDatabase, activeChatEntries: WorldInfoEntry[]): RPGDatabase => {
    // Deep clone to avoid mutating original
    const filteredDb: RPGDatabase = JSON.parse(JSON.stringify(db));
    
    // Create a Set of active UIDs for fast lookup
    const activeUidSet = new Set(activeChatEntries.map(e => e.uid));

    filteredDb.tables.forEach(table => {
        // Only filter tables that have Live-Link enabled
        if (table.config.lorebookLink?.enabled) {
            // Keep rows only if their generated UID exists in active set
            // Note: syncDatabaseToLorebook generates UIDs as `mythic_${tableId}_${rowUUID}`
            table.data.rows = table.data.rows.filter(row => {
                const rowUuid = row[0];
                const expectedUid = `mythic_${table.config.id}_${rowUuid}`;
                return activeUidSet.has(expectedUid);
            });
        }
        // Tables without Live-Link enabled are sent fully (or should they also be filtered? Prompt implied "Live-Link" pruning)
        // Assuming non-Live-Link tables are global/always active or managed differently.
    });

    return filteredDb;
};

// UPDATED: Now accepts optional contextDb to map View Index -> Real Row UUID
export const parseCustomActions = (rawText: string, snapshot?: RpgSnapshot): MedusaAction[] => {
    const actions: MedusaAction[] = [];
    const editBlockMatch = rawText.match(/<tableEdit>([\s\S]*?)<\/tableEdit>/);
    if (!editBlockMatch) return [];
    let content = editBlockMatch[1];
    
    content = content
        .replace(/<!--/g, '')
        .replace(/-->/g, '')
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

    const extractJson = (str: string, startPos: number): { json: any, endPos: number } | null => {
        let depth = 0;
        let inString = false;
        let quoteChar = '';
        let jsonStart = -1;

        for (let i = startPos; i < str.length; i++) {
            if (str[i] === '{') {
                jsonStart = i;
                break;
            }
        }
        if (jsonStart === -1) return null;

        for (let i = jsonStart; i < str.length; i++) {
            const char = str[i];
            
            if (inString) {
                if (char === quoteChar && str[i - 1] !== '\\') {
                    inString = false;
                }
            } else {
                if (char === '"' || char === "'") {
                    inString = true;
                    quoteChar = char;
                } else if (char === '{') {
                    depth++;
                } else if (char === '}') {
                    depth--;
                    if (depth === 0) {
                        const jsonStr = str.substring(jsonStart, i + 1);
                        try {
                            return { json: parseLooseJson(jsonStr), endPos: i + 1 };
                        } catch (e) {
                            console.warn("Medusa JSON Parse Error:", jsonStr, e);
                            return null;
                        }
                    }
                }
            }
        }
        return null;
    };

    const commandPattern = /(insertRow|updateRow|deleteRow)\s*\(/g;
    let match;

    while ((match = commandPattern.exec(content)) !== null) {
        const command = match[1];
        let currentPos = commandPattern.lastIndex;
        
        const getNextNumber = (): number | null => {
            const sub = content.substring(currentPos);
            const numMatch = sub.match(/^\s*(\d+)\s*(,|(?=\)))/);
            if (numMatch) {
                currentPos += numMatch[0].length;
                return parseInt(numMatch[1], 10);
            }
            return null;
        };

        const tableIndex = getNextNumber();
        if (tableIndex === null) continue;

        // ID MAPPING LOGIC: Resolve UUID from SNAPSHOT if available
        const getRowIdFromSnapshot = (tblIdx: number, rowIdx: number): string | undefined => {
            if (!snapshot || !snapshot[tblIdx]) return undefined;
            // The snapshot contains simple string[] of row UUIDs visible at time of prompt
            return snapshot[tblIdx][rowIdx]; 
        };

        if (command === 'deleteRow') {
            const rowIndex = getNextNumber();
            if (rowIndex !== null) {
                const rowId = getRowIdFromSnapshot(tableIndex, rowIndex);
                actions.push({ type: 'DELETE', tableIndex, rowIndex, rowId });
            }
        } else if (command === 'insertRow') {
            const result = extractJson(content, currentPos);
            if (result) {
                // Insert doesn't need row mapping as it creates new
                actions.push({ type: 'INSERT', tableIndex, data: result.json });
                currentPos = result.endPos;
            }
        } else if (command === 'updateRow') {
            const rowIndex = getNextNumber();
            if (rowIndex !== null) {
                const result = extractJson(content, currentPos);
                if (result) {
                    const rowId = getRowIdFromSnapshot(tableIndex, rowIndex);
                    actions.push({ type: 'UPDATE', tableIndex, rowIndex, data: result.json, rowId });
                    currentPos = result.endPos;
                }
            }
        }
    }

    return actions;
};

export const applyMedusaActions = (
    currentDb: RPGDatabase, 
    actions: MedusaAction[]
): { newDb: RPGDatabase; notifications: string[], logs: string[] } => {
    
    const newDb: RPGDatabase = JSON.parse(JSON.stringify(currentDb));
    const notifications: string[] = [];
    const logs: string[] = [];

    actions.forEach(action => {
        try {
            if (typeof action.tableIndex !== 'number') return;
            const table = newDb.tables[action.tableIndex];
            
            if (!table) {
                logs.push(`[WARN] Table Index not found: ${action.tableIndex}`);
                return;
            }

            // ID MAPPING RESOLUTION (CRITICAL FIX)
            // If action has a specific rowId (UUID resolved from snapshot), find the REAL index in the full DB.
            let targetRowIndex = action.rowIndex;
            if (action.rowId) {
                const realIndex = table.data.rows.findIndex(r => r[0] === action.rowId);
                if (realIndex !== -1) {
                    targetRowIndex = realIndex;
                } else {
                    // ID not found (maybe deleted concurrently or auto-pruned?)
                    // Aborting is safer to prevent modifying wrong row (index shifting).
                    logs.push(`[WARN] Row ID ${action.rowId} not found in table. Operation skipped to prevent data corruption.`);
                    return; 
                }
            }

            switch (action.type) {
                case 'UPDATE': {
                    if (typeof targetRowIndex !== 'number' || !action.data) break;
                    
                    const row = table.data.rows[targetRowIndex];
                    if (!row) {
                        logs.push(`[WARN] Row Index not found: ${action.tableIndex}:${targetRowIndex}`);
                        break;
                    }

                    Object.entries(action.data).forEach(([colIdxStr, val]) => {
                        const colIdx = parseInt(colIdxStr);
                        if (!isNaN(colIdx) && colIdx >= 0 && colIdx < table.config.columns.length) {
                            const oldValue = row[colIdx + 1]; 
                            row[colIdx + 1] = val; 
                            
                            const colName = table.config.columns[colIdx].label;
                            if (oldValue !== val && !colName.toLowerCase().includes('thời gian') && !colName.toLowerCase().includes('date')) {
                                notifications.push(`${table.config.name} (${colName}): ${oldValue} ➝ ${val}`);
                            }
                        }
                    });
                    
                    logs.push(`UPDATE ${table.config.name} (Row ${targetRowIndex})`);
                    break;
                }

                case 'INSERT': {
                    if (!action.data) break;

                    const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    const newRow = new Array(table.config.columns.length + 1).fill(""); 
                    newRow[0] = newId;

                    let primaryValue = "";

                    Object.entries(action.data).forEach(([colIdxStr, val]) => {
                        const colIdx = parseInt(colIdxStr);
                        if (!isNaN(colIdx) && colIdx >= 0 && colIdx < table.config.columns.length) {
                            newRow[colIdx + 1] = val;
                            if (colIdx === 0) primaryValue = String(val); 
                        }
                    });

                    table.data.rows.push(newRow);
                    logs.push(`INSERT ${table.config.name} -> ID: ${newId}`);
                    
                    if (primaryValue) {
                        notifications.push(`Mới: ${primaryValue} (${table.config.name})`);
                    } else {
                        notifications.push(`Cập nhật mới trong bảng: ${table.config.name}`);
                    }
                    break;
                }

                case 'DELETE': {
                    if (typeof targetRowIndex !== 'number') break;
                    
                    if (targetRowIndex >= 0 && targetRowIndex < table.data.rows.length) {
                        const deletedRow = table.data.rows.splice(targetRowIndex, 1);
                        logs.push(`DELETE ${table.config.name} (Row ${targetRowIndex})`);
                        
                        const deletedName = deletedRow[0][1];
                        if (deletedName) {
                            notifications.push(`Đã xóa: ${deletedName} (${table.config.name})`);
                        } else {
                            notifications.push(`Đã xóa một mục khỏi: ${table.config.name}`);
                        }
                    }
                    break;
                }
            }
        } catch (e) {
            logs.push(`[ERROR] Processing action ${action.type}: ${e instanceof Error ? e.message : String(e)}`);
        }
    });

    newDb.lastUpdated = Date.now();
    return { newDb, notifications, logs };
};

// --- LIVE LINK LOGIC (OPTION A: MARKDOWN CARD) ---

export const syncDatabaseToLorebook = (db: RPGDatabase): WorldInfoEntry[] => {
    const entries: WorldInfoEntry[] = [];

    db.tables.forEach(table => {
        const linkConfig = table.config.lorebookLink;
        if (!linkConfig || !linkConfig.enabled || !linkConfig.keyColumnId) return;

        // Find index of the key column
        const keyColIndex = table.config.columns.findIndex(c => c.id === linkConfig.keyColumnId);
        if (keyColIndex === -1) return;

        table.data.rows.forEach(row => {
            const rowId = row[0]; // UUID
            const keyValue = row[keyColIndex + 1]; 
            
            if (!keyValue) return; // Skip rows without key value

            // --- OPTION A: MARKDOWN CARD FORMAT ---
            // Header
            let contentLines = [`### [Mythic Data] ${keyValue}`];
            contentLines.push(`**Nguồn:** ${table.config.name}`);
            
            // Body Loop
            table.config.columns.forEach((col, idx) => {
                const val = row[idx + 1];
                if (val === null || val === undefined || val === '') return;
                contentLines.push(`- **${col.label}:** ${val}`);
            });

            const fullContent = contentLines.join('\n');

            const entry: WorldInfoEntry = {
                uid: `mythic_${table.config.id}_${rowId}`, // Stable UID
                keys: [String(keyValue)],
                secondary_keys: [], 
                comment: `[Live-Link] ${keyValue}`,
                content: fullContent,
                constant: false,
                selective: true,
                enabled: true,
                position: 'before_char',
                use_regex: false,
                insertion_order: 100 
            };

            entries.push(entry);
        });
    });

    return entries;
};

// --- MAIN SERVICE ---

export const MedusaService = {
    processTurn: async (
        historyLog: string,
        database: RPGDatabase,
        apiKey: string,
        activeChatEntries: WorldInfoEntry[], 
        allAvailableEntries: WorldInfoEntry[],
        defaultModelId: string = 'gemini-2.5-pro',
        maxTokens: number = 8192
    ): Promise<MedusaResult> => { 
        
        const connection = getConnectionSettings();
        const useProxy = connection.source === 'proxy' || getProxyForTools();
        
        const targetModel = database.settings?.modelId || (useProxy ? connection.proxy_tool_model || connection.proxy_model : defaultModelId);

        // Gather context from Pinned Items & Active Items (Prompt Context)
        const pinnedUids = database.settings?.pinnedLorebookUids || [];
        const uniqueEntriesMap = new Map<string, WorldInfoEntry>();

        pinnedUids.forEach(uid => {
            const entry = allAvailableEntries.find(e => e.uid === uid);
            if (entry) uniqueEntriesMap.set(uid, entry);
        });

        activeChatEntries.forEach(entry => {
            if (entry.uid) uniqueEntriesMap.set(entry.uid, entry);
        });

        let lorebookContext = "";
        uniqueEntriesMap.forEach(entry => {
            // NEW LOGIC: Skip Live-Link entries (mythic_*) because they are now rendered
            // directly inside {{rpg_hybrid_table}} as data rows to save tokens.
            if (entry.uid && entry.uid.startsWith('mythic_')) {
                return;
            }
            lorebookContext += `### [Lore: ${entry.comment || 'Untitled'}]\n${entry.content}\n\n`;
        });
        if (!lorebookContext) lorebookContext = "(Không có dữ liệu tham khảo)";

        // --- FILTER DATABASE FOR CONTEXT ---
        // Only send rows relevant to Active Live-Links to save tokens
        const filteredDb = filterDatabaseForContext(database, activeChatEntries);

        // --- SNAPSHOT CREATION ---
        // Create a map of indices to UUIDs to be used when parsing the response
        // Note: This snapshot is implicit in standalone mode because we use `filteredDb` to parse actions
        // In standalone mode, we pass filteredDb directly to parseCustomActions.
        // -------------------------

        const rawSystemPrompt = database.settings?.customSystemPrompt || DEFAULT_MEDUSA_PROMPT;
        // Use filteredDb for prompt resolution
        const resolvedSystemPrompt = resolveMedusaMacros(rawSystemPrompt, filteredDb, historyLog, lorebookContext);

        try {
            let rawText = "";

            if (useProxy) {
                // PROXY ROUTE
                rawText = await callOpenAIProxyTask(
                    resolvedSystemPrompt,
                    targetModel,
                    connection.proxy_protocol,
                    safetySettings,
                    maxTokens
                );
            } else {
                // DIRECT GEMINI ROUTE
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: targetModel,
                    contents: resolvedSystemPrompt, 
                    config: {
                        temperature: 0.1,
                        safetySettings,
                        maxOutputTokens: maxTokens 
                    }
                });
                rawText = response.text || "";
            }
            
            const thinkMatch = rawText.match(/<tableThink>([\s\S]*?)<\/tableThink>/);
            const thinkContent = thinkMatch ? thinkMatch[1].replace(/<!--|-->/g, '').trim() : "No thinking data.";
            
            // Pass the snapshot (derived from filteredDb) to parser
            // Actually, parseCustomActions takes snapshot or contextDb. 
            // In standalone mode, we have `filteredDb` which matches exactly what AI sees.
            // So we can extract snapshot from it.
            const snapshot = createRpgSnapshot(filteredDb);
            const actions = parseCustomActions(rawText, snapshot);

            if (actions.length === 0) {
                return {
                    success: false,
                    error: "Cảnh báo: AI không thực hiện bất kỳ cập nhật trạng thái nào (Empty Action).",
                    logs: ["Action list empty"],
                    debugInfo: {
                        prompt: resolvedSystemPrompt,
                        rawResponse: rawText
                    }
                };
            }

            if (actions.length > 0) {
                // Apply actions to the FULL original database (since we want to save changes to the real DB)
                // The actions now contain rowId (UUID) so applying to full DB works correctly regardless of indexing
                const { newDb, notifications, logs } = applyMedusaActions(database, actions);
                logs.unshift(`[Thinking]: ${thinkContent.substring(0, 200)}...`);
                
                return {
                    success: true,
                    newDb: newDb,
                    notifications: notifications,
                    logs: logs,
                    rawActions: actions,
                    debugInfo: {
                        prompt: resolvedSystemPrompt,
                        rawResponse: rawText
                    }
                };
            } else {
                return {
                    success: true,
                    newDb: database,
                    notifications: [],
                    logs: [`[Thinking]: ${thinkContent.substring(0, 100)}...`, "No actions required."],
                    rawActions: actions,
                    debugInfo: {
                        prompt: resolvedSystemPrompt,
                        rawResponse: rawText
                    }
                };
            }

        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error), 
                logs: [],
                debugInfo: {
                    prompt: resolvedSystemPrompt,
                    rawResponse: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            };
        }
    }
};
