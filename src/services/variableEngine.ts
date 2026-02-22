
import _ from 'lodash';

/**
 * VARIABLE ENGINE - TUPLE-AWARE PROXY SANDBOX (World-Class Standard)
 * 
 * Kiến trúc:
 * 1. Native Execution: Sử dụng `new Function` để đạt hiệu suất tối đa.
 * 2. Lodash Inheritance: Kế thừa lodash thật, chỉ override các hàm mutate dữ liệu.
 * 3. Tuple-Awareness: Tự động phát hiện và bảo tồn cấu trúc [Value, Description].
 * 4. Type Safety: Ép kiểu số học nghiêm ngặt cho các phép toán.
 * 5. Smart Polymorphism: Tự động xử lý add/concat/push dựa trên kiểu dữ liệu.
 * 6. Scope Isolation: Che khuất biến toàn cục (window, document...).
 */

// --- 1. UTILITIES ---

/**
 * Làm sạch chuỗi script từ AI.
 * Loại bỏ các thẻ XML rác (<Analysis>, <Thinking>) và chỉ giữ lại code JS hợp lệ.
 */
const extractScriptContent = (rawText: string): { script: string, cleanText: string } => {
    // Regex tìm khối <UpdateVariable> (không phân biệt hoa thường)
    const updateBlockRegex = /<UpdateVariable(?:variable)?>([\s\S]*?)<\/UpdateVariable(?:variable)?>/i;
    const match = rawText.match(updateBlockRegex);

    if (!match || !match[1]) {
        return { script: "", cleanText: rawText };
    }

    let rawContent = match[1];

    // Xóa các khối meta-data thường gặp trong output của LLM
    rawContent = rawContent
        .replace(/<Analysis>[\s\S]*?<\/Analysis>/gi, "")
        .replace(/<Thinking>[\s\S]*?<\/Thinking>/gi, "")
        .replace(/<Comment>[\s\S]*?<\/Comment>/gi, "")
        .trim();

    // Lọc dòng: Chỉ giữ lại các dòng có vẻ là code JS, loại bỏ markdown fences và labels
    const lines = rawContent.split('\n');
    const validLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (trimmed.startsWith('<')) return false; // Thẻ XML lẻ loi
        if (trimmed.startsWith('```')) return false; // Markdown fence
        if (/^[A-Za-z0-9_]+:\s*$/i.test(trimmed)) return false; // Label rác (VD: "Analysis:")
        return true;
    });

    let script = validLines.join('\n').trim();
    
    // Giải mã HTML entities cơ bản nếu AI lỡ encode code
    script = script
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/[\u2018\u2019]/g, "'") // Smart quotes -> Straight quotes
        .replace(/[\u201C\u201D]/g, '"');

    // Xóa khối lệnh khỏi văn bản hiển thị cuối cùng
    const cleanText = rawText.replace(updateBlockRegex, "").trim();

    return { script, cleanText };
};

/**
 * Chuẩn hóa đường dẫn biến số (Path Normalization).
 * Chuyển đổi: a['b'][0] -> a.b.0
 */
const normalizePath = (path: string): string => {
    if (!path) return '';
    return path
        .replace(/^stat_data\./, '') // Xóa prefix thường gặp trong V3
        .replace(/^variables\./, '')
        .replace(/\["([^"]+)"\]/g, '.$1')
        .replace(/\['([^']+)'\]/g, '.$1')
        .replace(/\[(\d+)\]/g, '.$1');
};

/**
 * Kiểm tra xem một giá trị có phải là Tuple của SillyTavern không.
 * Signature: [Value, Description (string)]
 */
const isTuple = (val: any): boolean => {
    return Array.isArray(val) && val.length === 2 && typeof val[1] === 'string';
};

/**
 * Lấy giá trị từ object (Deep Get) với khả năng tự động bóc tách Tuple.
 * @param unwrapTuple Nếu true, trả về giá trị bên trong Tuple. Nếu false, trả về raw Tuple.
 */
export const get = (obj: any, path: string, defaultValue: any = undefined, unwrapTuple: boolean = true): any => {
    const cleanPath = normalizePath(path);
    const val = _.get(obj, cleanPath);
    
    if (unwrapTuple && isTuple(val)) {
        return val[0];
    }
    
    return val === undefined ? defaultValue : val;
};

/**
 * Gán giá trị vào object (Deep Set) với khả năng bảo tồn Tuple.
 */
const set = (obj: any, path: string, value: any): void => {
    const cleanPath = normalizePath(path);
    
    // Lấy giá trị hiện tại để kiểm tra cấu trúc
    const currentVal = _.get(obj, cleanPath);

    if (isTuple(currentVal)) {
        // Nếu đích là Tuple, chỉ cập nhật giá trị (index 0), giữ nguyên mô tả (index 1)
        // Chúng ta tạo một mảng mới để đảm bảo tính bất biến (immutability) ở mức shallow nếu cần
        const newTuple = [value, currentVal[1]];
        _.set(obj, cleanPath, newTuple);
    } else {
        // Gán bình thường
        _.set(obj, cleanPath, value);
    }
};

/**
 * Xử lý các phép toán số học an toàn (Strict Math).
 * Tự động ép kiểu Number() để tránh lỗi cộng chuỗi khi ý định là toán học.
 * Dùng cho: sub, mul, div, mod
 */
const mathOp = (obj: any, path: string, val: any, op: 'sub' | 'mul' | 'div' | 'mod') => {
    // Lấy giá trị hiện tại (đã unwrap nếu là tuple)
    const currentRaw = get(obj, path, 0); 
    const currentNum = Number(currentRaw);
    const operand = Number(val);

    if (isNaN(operand)) return; // Bỏ qua nếu tham số không phải số
    // Nếu giá trị hiện tại không phải số (ví dụ null/undefined), mặc định là 0
    const safeCurrent = isNaN(currentNum) ? 0 : currentNum;

    let result = safeCurrent;
    switch (op) {
        case 'sub': result -= operand; break;
        case 'mul': result *= operand; break;
        case 'div': result = operand !== 0 ? result / operand : result; break; // Tránh chia cho 0
        case 'mod': result = operand !== 0 ? result % operand : result; break;
    }

    // Ghi lại giá trị (hàm set sẽ tự lo việc bảo tồn tuple)
    set(obj, path, result);
};

/**
 * SMART ADD OPERATION (Polymorphic)
 * Tự động phát hiện kiểu dữ liệu để thực hiện hành động hợp lý nhất:
 * 1. Nếu biến là Số -> Cộng toán học.
 * 2. Nếu biến là Mảng -> Push vào mảng.
 * 3. Nếu biến là Chuỗi (hoặc khác) -> Nối chuỗi (Concatenate).
 * 4. Nếu biến chưa tồn tại -> Khởi tạo.
 */
const smartAddOp = (obj: any, path: string, val: any): string => {
    const current = get(obj, path, undefined, true); // Unwrap tuple

    // Case 1: Initialize (Biến chưa tồn tại)
    if (current === undefined || current === null) {
        set(obj, path, val);
        return 'INIT';
    }

    // Case 2: Number Arithmetic (Nếu cả đích và nguồn đều ép kiểu số thành công và đích ĐANG là số)
    if (typeof current === 'number') {
        const valNum = Number(val);
        if (!isNaN(valNum)) {
            set(obj, path, current + valNum);
            return 'MATH';
        }
    }

    // Case 3: Array Push
    if (Array.isArray(current)) {
        current.push(val);
        // Lưu ý: Array trong JS là tham chiếu, nên push trực tiếp đã thay đổi obj gốc.
        // Tuy nhiên, nếu biến đó nằm trong Tuple, ta không cần gọi set() vì get() đã trả về tham chiếu đến array bên trong tuple.
        return 'PUSH';
    }

    // Case 4: String Concatenation (Fallback)
    // Dùng cho việc nối prompt, rule, memory
    set(obj, path, String(current) + String(val));
    return 'CONCAT';
};

// --- 2. ENGINE CORE ---

/**
 * Tạo ra một phiên bản Lodash "lai" (Hybrid Lodash).
 * Nó kế thừa mọi hàm của lodash gốc, nhưng ghi đè các hàm thao tác dữ liệu
 * để phù hợp với logic của SillyTavern (Tuple, Math, Logging, SmartAdd).
 */
const createHybridLodash = (scopeVariables: any, logger: (msg: string) => void) => {
    
    // Các hàm Override (Custom Logic)
    const customOverrides = {
        // --- Accessors ---
        get: (path: string, def?: any) => get(scopeVariables, path, def),
        
        set: (path: string, val: any, ...args: any[]) => {
            // Hỗ trợ cú pháp: _.set(path, oldVal, newVal) mà một số prompt AI hay dùng
            // Chúng ta luôn lấy đối số cuối cùng làm giá trị mới.
            const actualVal = args.length > 0 ? args[args.length - 1] : val;
            set(scopeVariables, path, actualVal);
            logger(`SET ${path} = ${JSON.stringify(actualVal)}`);
        },

        // --- Smart Add (Polymorphic) ---
        add: (path: string, val: any) => { 
            const type = smartAddOp(scopeVariables, path, val);
            logger(`ADD [${type}] ${path} += ${JSON.stringify(val)}`); 
        },

        // --- Strict Math Ops ---
        sub: (path: string, val: any) => { mathOp(scopeVariables, path, val, 'sub'); logger(`SUB ${path} -= ${val}`); },
        mul: (path: string, val: any) => { mathOp(scopeVariables, path, val, 'mul'); logger(`MUL ${path} *= ${val}`); },
        div: (path: string, val: any) => { mathOp(scopeVariables, path, val, 'div'); logger(`DIV ${path} /= ${val}`); },
        
        // --- Smart MVU Operations (Array/Object Polymorphic) ---
        
        // Insert: 
        // 1. Array Push: _.insert('arr', value)
        // 2. Array Splice: _.insert('arr', index, value)
        // 3. Object Key: _.insert('obj', key, value)
        insert: (path: string, arg1: any, arg2?: any) => {
            const target = get(scopeVariables, path, undefined, true); // Unwrap tuple to get raw container
            
            if (Array.isArray(target)) {
                if (arg2 !== undefined && typeof arg1 === 'number') {
                    // _.insert(path, index, value)
                    target.splice(arg1, 0, arg2);
                    logger(`INSERT (SPLICE) ${path} at [${arg1}] << ${JSON.stringify(arg2)}`);
                } else {
                    // _.insert(path, value) -> Default to push
                    // Handle case where AI sends (path, value) but meant push
                    const val = arg2 !== undefined ? arg2 : arg1;
                    target.push(val);
                    logger(`INSERT (PUSH) ${path} << ${JSON.stringify(val)}`);
                }
            } else if (typeof target === 'object' && target !== null) {
                 // _.insert(path, key, value)
                 if (arg2 !== undefined) {
                     target[arg1] = arg2;
                     logger(`INSERT (KEY) ${path} [${arg1}] = ${JSON.stringify(arg2)}`);
                 } else {
                     logger(`WARN: INSERT failed. Missing value for object key at '${path}'.`);
                 }
            } else {
                logger(`WARN: INSERT failed. Target at '${path}' is not an array or object.`);
            }
        },
        
        // Remove:
        // 1. Array by Value: _.remove('arr', value) (First match)
        // 2. Array by Index: _.remove('arr', index)
        // 3. Object Key: _.remove('obj', key)
        remove: (path: string, arg1: any) => {
            const target = get(scopeVariables, path, undefined, true);
            
            if (Array.isArray(target)) {
                let removed = false;
                
                // Priority 1: Remove by Value (MVU standard implies removal by value first)
                // We check if arg1 exists as a value in the array
                const valIdx = target.findIndex(item => _.isEqual(item, arg1) || item === arg1);
                
                if (valIdx > -1) {
                    target.splice(valIdx, 1);
                    logger(`REMOVE (VALUE) ${path} >> ${JSON.stringify(arg1)}`);
                    removed = true;
                } 
                // Priority 2: Remove by Index (Fallback if value not found, but arg1 is a valid index)
                else if (typeof arg1 === 'number' && arg1 >= 0 && arg1 < target.length) {
                    const deleted = target.splice(arg1, 1);
                    logger(`REMOVE (INDEX) ${path} [${arg1}] >> ${JSON.stringify(deleted[0])}`);
                    removed = true;
                }
                
                if (!removed) {
                    logger(`WARN: REMOVE failed. Value/Index '${arg1}' not found in array '${path}'.`);
                }

            } else if (typeof target === 'object' && target !== null) {
                if (arg1 in target) {
                    delete target[arg1];
                    logger(`REMOVE (KEY) ${path} [${arg1}]`);
                } else {
                    logger(`WARN: REMOVE failed. Key '${arg1}' not found in object '${path}'.`);
                }
            } else {
                logger(`WARN: REMOVE failed. Target at '${path}' is not an array or object.`);
            }
        },

        // Push Alias (Strictly Array)
        push: (path: string, val: any) => {
            const arr = get(scopeVariables, path, undefined, true);
            if (Array.isArray(arr)) {
                arr.push(val);
                logger(`PUSH ${path} << ${JSON.stringify(val)}`);
            }
        },
        
        // Assign (Legacy Polymorphic)
        assign: (path: string, ...args: any[]) => {
            let target = get(scopeVariables, path, undefined, false); // Get raw
            if (isTuple(target)) target = target[0];

            if (args.length >= 2) {
                // Object Set (path, key, value)
                const key = args[0];
                const value = args[1];
                set(scopeVariables, `${path}.${key}`, value);
                logger(`ASSIGN (KEY) ${path}.${key} = ${JSON.stringify(value)}`);
            } else if (args.length === 1) {
                // Array Push (path, value)
                const value = args[0];
                const arr = get(scopeVariables, path, undefined, true);
                if (Array.isArray(arr)) {
                    if (arr.length === 1 && arr[0] === '$__META_EXTENSIBLE__$') arr.pop();
                    arr.push(value);
                    logger(`ASSIGN (PUSH) ${path} << ${JSON.stringify(value)}`);
                }
            }
        },

        // Logger nội bộ
        log: (msg: any) => logger(`SCRIPT LOG: ${String(msg)}`)
    };

    // Tạo object mới kế thừa lodash gốc, sau đó ghi đè bằng customOverrides
    const hybrid = Object.assign({}, _, customOverrides);
    return hybrid;
};

/**
 * Hàm thực thi chính.
 * Chạy script trong sandbox an toàn và trả về biến số đã cập nhật.
 */
export const processVariableUpdates = (
    rawText: string,
    currentVariables: Record<string, any>
): { updatedVariables: Record<string, any>; cleanedText: string; variableLog: string } => {
    
    const { script, cleanText } = extractScriptContent(rawText);
    
    // Nếu không có script, trả về nguyên trạng
    if (!script) {
        return { 
            updatedVariables: currentVariables, 
            cleanedText: cleanText, 
            variableLog: '' 
        };
    }

    // Deep Copy biến số để đảm bảo tính bất biến (Immutability) cho React state
    const workingVariables = JSON.parse(JSON.stringify(currentVariables));
    
    const logMessages: string[] = [];
    const logger = (msg: string) => logMessages.push(msg);

    // Tạo thư viện _ (hybrid)
    const hybridLib = createHybridLodash(workingVariables, logger);

    logMessages.push('[JS ENGINE] Script detected. Executing...');

    try {
        // --- SANDBOX CONSTRUCTION ---
        // Sử dụng 'new Function' thay vì eval để có scope sạch hơn.
        // Truyền vào các tham số cần thiết và CHE KHUẤT (Shadow) các biến toàn cục.
        
        const safeRunner = new Function(
            'variables',   // Tham số 1: Object biến số
            '_',           // Tham số 2: Thư viện Lodash Hybrid
            'stat_data',   // Tham số 3: Alias cho variables (V3 hay dùng)
            'window', 'document', 'fetch', 'XMLHttpRequest', 'alert', 'console', // Shadowing globals -> undefined
            `
            "use strict";
            // Bắt lỗi bên trong script để không crash app
            try {
                ${script}
            } catch (e) {
                // Ném lỗi ra ngoài để engine bắt được
                throw e;
            }
            `
        );

        // Thực thi
        safeRunner(
            workingVariables, 
            hybridLib, 
            workingVariables, // stat_data trỏ cùng vùng nhớ với variables
            undefined, undefined, undefined, undefined, undefined, // Shadowed globals set to undefined
            { log: logger, error: logger, warn: logger } // Mock console
        );

        logMessages.push('[JS ENGINE] Execution successful.');

    } catch (e) {
        const errMessage = e instanceof Error ? e.message : String(e);
        logMessages.push(`[JS ENGINE ERROR] ${errMessage}`);
        console.error("Variable Script Error:", e);
        
        // Nếu lỗi, trả về biến số CŨ để tránh làm hỏng dữ liệu, nhưng vẫn trả về log lỗi và text sạch
        return {
            updatedVariables: currentVariables,
            cleanedText: cleanText,
            variableLog: logMessages.join('\n')
        };
    }

    return {
        updatedVariables: workingVariables,
        cleanedText: cleanText,
        variableLog: logMessages.join('\n')
    };
};

/**
 * Legacy Wrapper - Để tương thích ngược với các module cũ gọi applyVariableOperation.
 * Chuyển hướng sang dùng logic mới của engine này.
 */
export const applyVariableOperation = (
    currentVariables: Record<string, any>,
    command: 'set' | 'add' | 'sub' | 'mul' | 'div' | 'mod' | 'insert' | 'remove' | 'push',
    path: string,
    valueOrArgs: any
): Record<string, any> => {
    // Tạo bản sao
    const newVars = JSON.parse(JSON.stringify(currentVariables));
    
    // Mapping thủ công sang logic mới
    if (command === 'set') set(newVars, path, valueOrArgs);
    else if (command === 'add') smartAddOp(newVars, path, valueOrArgs); // Use Smart Add
    else if (['sub', 'mul', 'div', 'mod'].includes(command)) mathOp(newVars, path, valueOrArgs, command as any);
    else if (command === 'push' || command === 'insert') {
        const arr = get(newVars, path, undefined, true);
        if (Array.isArray(arr)) arr.push(valueOrArgs);
    }
    else if (command === 'remove') {
         const arr = get(newVars, path, undefined, true);
         if (Array.isArray(arr)) {
             const idx = arr.indexOf(valueOrArgs);
             if (idx > -1) arr.splice(idx, 1);
         }
    }
    
    return newVars;
};
