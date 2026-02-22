
import { applyVariableOperation, get } from './variableEngine';

// --- TYPES ---

export interface ScriptContext {
    variables: Record<string, any>;
    setVariables: (newVars: Record<string, any>) => void;
    sendMessage: (content: string, role?: 'user' | 'model' | 'system') => void;
    triggerSystemAction: (action: string, data?: any) => void;
    characterName: string;
    userPersonaName: string;
    log: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => void;
    // UI Hooks
    setVisualState?: (type: 'bg' | 'music' | 'sound' | 'class', value: string) => void;
    showToast?: (message: string, type?: 'info'|'success'|'error') => void;
    showPopup?: (content: string, title?: string) => void;
    setQuickReplies?: (replies: {label: string, message?: string, action?: string}[]) => void;
    setIsInputLocked?: (isLocked: boolean) => void; // NEW
}

// Engine Runtime State
interface ExecutionState {
    pc: number; // Program Counter
    commands: string[];
    labels: Record<string, number>; // Label Map
    flowStack: BlockState[]; // If/Else Stack
    maxSteps: number; // Safety Fuse
}

interface BlockState {
    type: 'IF';
    isExecutable: boolean; 
    complete: boolean; 
}

type CommandHandler = (args: string[], context: ScriptContext, rawArgs: string, execState: ExecutionState) => Promise<void | boolean>;

// --- UTILITIES ---

const parseArguments = (str: string): string[] => {
    const args: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char === '"' || char === "'") && !inQuote) {
            inQuote = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuote) {
            inQuote = false;
            quoteChar = '';
        } else if (char === ' ' && !inQuote) {
            if (current.length > 0) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    if (current.length > 0) args.push(current);
    return args;
};

const resolveMacros = (text: string, context: ScriptContext): string => {
    let processed = text;

    // --- PRIORITY 1: RANDOM & ROLL (Must resolve BEFORE being set into variables) ---
    
    // Random: {{random:a,b,c}}
    processed = processed.replace(/{{random:(.*?)}}/gi, (_, content) => {
        const args = content.split(',');
        if (args.length === 2 && !isNaN(Number(args[0])) && !isNaN(Number(args[1]))) {
            const min = Number(args[0]);
            const max = Number(args[1]);
            return String(Math.floor(Math.random() * (max - min + 1)) + min);
        } else if (args.length >= 1) {
            return args[Math.floor(Math.random() * args.length)].trim();
        }
        return '';
    });
    
    // Pick: {{pick:a,b,c}}
    processed = processed.replace(/{{pick:(.*?)}}/gi, (_, content) => {
        const args = content.split(',').map((s: string) => s.trim());
        if (args.length > 0) {
            return args[Math.floor(Math.random() * args.length)];
        }
        return '';
    });

    // Dice/Roll: {{dice:XdY+Z}} AND {{roll:XdY+Z}}
    const rollHandler = (_: string, countStr: string, sidesStr: string, modStr: string) => {
        const count = countStr ? parseInt(countStr, 10) : 1; // Default to 1 die if X is missing
        const sides = parseInt(sidesStr, 10);
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        if (modStr) {
            const cleanMod = modStr.replace(/\s/g, '');
            total += parseInt(cleanMod, 10);
        }
        return String(total);
    };

    processed = processed.replace(/{{dice:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollHandler);
    processed = processed.replace(/{{roll:(\s*\d*)d(\d+)\s*([+-]\s*\d+)?\s*}}/gi, rollHandler); 

    // --- PRIORITY 2: IDENTITY & TIME ---
    processed = processed.replace(/{{char}}/gi, context.characterName);
    processed = processed.replace(/{{user}}/gi, context.userPersonaName);
    
    const now = new Date();
    processed = processed.replace(/{{time}}/gi, now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    processed = processed.replace(/{{date}}/gi, now.toLocaleDateString());

    // --- PRIORITY 3: VARIABLE OPERATIONS (GET/SET) ---

    // 1. Variable Macros: {{getvar::path}}
    processed = processed.replace(/{{getvar::([^}]+)}}/gi, (_, path) => {
        const val = get(context.variables, path);
        return val !== undefined ? String(val) : '';
    });

    // 2. Global Variable Macros: {{getglobalvar::key}} & {{setglobalvar::key::value}}
    processed = processed.replace(/{{getglobalvar::([^}]+)}}/gi, (_, key) => {
        const val = get(context.variables, 'globals.' + key);
        return val !== undefined ? String(val) : '';
    });

    processed = processed.replace(/{{setglobalvar::([^:]+)::(.*?)}}/gi, (_, key, val) => {
        const newVars = applyVariableOperation(context.variables, 'set', 'globals.' + key, val);
        context.setVariables(newVars);
        return ''; 
    });

    // 3. Set Variable Generic: {{setvar::key::value}} (New support)
    processed = processed.replace(/{{setvar::([^:]+)::(.*?)}}/gi, (_, key, val) => {
        const newVars = applyVariableOperation(context.variables, 'set', key, val);
        context.setVariables(newVars);
        return ''; 
    });

    // 4. Fallback: Simple {{key}} lookup
    processed = processed.replace(/{{\s*([a-zA-Z0-9_.[\]]+)\s*}}/g, (match, key) => {
         if (key.includes(':')) return match;
         const val = get(context.variables, key);
         return val !== undefined ? String(val) : match;
    });

    return processed;
};

const evaluateCondition = (left: any, op: string, right: any): boolean => {
    const nLeft = Number(left);
    const nRight = Number(right);
    const isNumeric = !isNaN(nLeft) && !isNaN(nRight);

    const l = isNumeric ? nLeft : left;
    const r = isNumeric ? nRight : right;

    switch (op) {
        case '==': case 'eq': return l == r;
        case '===': return l === r;
        case '!=': case 'neq': return l != r;
        case '!==': return l !== r;
        case '>': case 'gt': return l > r;
        case '>=': case 'gte': return l >= r;
        case '<': case 'lt': return l < r;
        case '<=': case 'lte': return l <= r;
        case 'includes': return String(left).includes(String(right));
        case '!includes': return !String(left).includes(String(right));
        default: return false;
    }
};

// --- COMMAND DEFINITIONS ---

const commands: Record<string, CommandHandler> = {
    // --- MESSAGING ---
    'echo': async (args, ctx, rawArgs) => ctx.sendMessage(rawArgs, 'system'),
    'send': async (args, ctx, rawArgs) => ctx.sendMessage(rawArgs, 'user'),
    'sys': async (args, ctx, rawArgs) => ctx.sendMessage(rawArgs, 'system'),
    'as': async (args, ctx, rawArgs) => {
        if (args.length >= 2) {
            const name = args[0];
            const contentStart = rawArgs.indexOf(name) + name.length;
            let content = rawArgs.substring(contentStart).trim();
            if (content.startsWith('"') && content.endsWith('"')) content = content.slice(1, -1);
            ctx.sendMessage(`${name}: ${content}`, 'system'); 
        }
    },

    // --- VARIABLE OPERATIONS ---
    'set': async (args, ctx) => {
        let key = args[0];
        let value = args[1];
        // Handle /set var=value syntax
        if (key && key.includes('=') && !value) {
            const parts = key.split('=');
            key = parts[0];
            value = parts.slice(1).join('=');
        }
        if (key && value !== undefined) {
            const newVars = applyVariableOperation(ctx.variables, 'set', key, value);
            ctx.setVariables(newVars);
        }
    },
    'var': async (args, ctx, raw, state) => commands['set'](args, ctx, raw, state),
    'get': async (args, ctx) => {
        const val = get(ctx.variables, args[0]);
        ctx.sendMessage(`[System] ${args[0]} = ${val}`, 'system');
    },
    'add': async (args, ctx) => {
        const newVars = applyVariableOperation(ctx.variables, 'add', args[0], args[1]);
        ctx.setVariables(newVars);
    },
    'sub': async (args, ctx) => {
        const newVars = applyVariableOperation(ctx.variables, 'sub', args[0], args[1]);
        ctx.setVariables(newVars);
    },
    'mul': async (args, ctx) => {
        const newVars = applyVariableOperation(ctx.variables, 'mul', args[0], args[1]);
        ctx.setVariables(newVars);
    },
    'div': async (args, ctx) => {
        const newVars = applyVariableOperation(ctx.variables, 'div', args[0], args[1]);
        ctx.setVariables(newVars);
    },
    // Support globalvar command alias
    'setglobalvar': async (args, ctx) => {
        const key = 'globals.' + args[0];
        const value = args[1];
        if (key && value !== undefined) {
            const newVars = applyVariableOperation(ctx.variables, 'set', key, value);
            ctx.setVariables(newVars);
        }
    },
    
    // --- ARRAY & STRING MANIPULATION (NEW) ---
    'length': async (args, ctx) => {
        // /length target_var source_var
        const targetVar = args[0];
        const sourceVal = get(ctx.variables, args[1]);
        let len = 0;
        if (Array.isArray(sourceVal) || typeof sourceVal === 'string') len = sourceVal.length;
        const newVars = applyVariableOperation(ctx.variables, 'set', targetVar, len);
        ctx.setVariables(newVars);
    },
    'concat': async (args, ctx) => {
        // /concat target_var val1 val2 ...
        const targetVar = args[0];
        let result = '';
        for (let i = 1; i < args.length; i++) {
            result += String(args[i]);
        }
        const newVars = applyVariableOperation(ctx.variables, 'set', targetVar, result);
        ctx.setVariables(newVars);
    },

    // --- FLOW CONTROL (JUMPS) ---
    'jump': async (args, ctx, raw, state) => {
        const label = args[0];
        if (state.labels[label] !== undefined) {
            state.pc = state.labels[label]; // Jump!
        } else {
            ctx.log('warn', `Label not found: ${label}`);
        }
    },
    'goto': async (args, ctx, raw, state) => commands['jump'](args, ctx, raw, state),
    'go': async (args, ctx, raw, state) => commands['jump'](args, ctx, raw, state),
    
    // --- DELAY & TIMING ---
    'wait': async (args, ctx) => {
        const ms = parseInt(args[0], 10);
        if (!isNaN(ms)) await new Promise(resolve => setTimeout(resolve, ms));
    },
    'delay': async (args, ctx, raw, state) => commands['wait'](args, ctx, raw, state),

    // --- UI & INTERACTION ---
    'lock': async (args, ctx) => {
        if (ctx.setIsInputLocked) ctx.setIsInputLocked(true);
    },
    'unlock': async (args, ctx) => {
        if (ctx.setIsInputLocked) ctx.setIsInputLocked(false);
    },
    'input': async (args, ctx, rawArgs) => {
        const text = args[0] || rawArgs;
        window.dispatchEvent(new CustomEvent('sillytavern:set-input', { detail: text }));
    },
    'qr': async (args, ctx, rawArgs) => {
        if (ctx.setQuickReplies) {
             const parts = rawArgs.split('|').map(s => s.trim()).filter(Boolean);
             const replies = parts.map(p => ({ label: p, message: p }));
             ctx.setQuickReplies(replies);
        }
    },
    'buttons': async (args, ctx, rawArgs) => {
        if (ctx.setQuickReplies) {
            const buttonDefs = rawArgs.split('|');
            const replies = buttonDefs.map(def => {
                const match = def.trim().match(/^"([^"]+)"\s*(.*)$/);
                if (match) return { label: match[1], action: match[2] || match[1] };
                const parts = def.trim().split(/\s+(.+)/);
                return { label: parts[0], action: parts[1] || parts[0] };
            });
            ctx.setQuickReplies(replies);
        }
    },
    'toast': async (args, ctx, rawArgs) => {
        const msg = args[0] || rawArgs;
        const type = (args[1] as any) || 'info';
        if (ctx.showToast) ctx.showToast(msg, type);
    },
    'popup': async (args, ctx, rawArgs) => {
        const content = args[0] || rawArgs;
        if (ctx.showPopup) ctx.showPopup(content);
    },
    
    // --- VISUALS ---
    'bg': async (args, ctx, rawArgs) => {
        const url = args[0] || rawArgs;
        if (ctx.setVisualState) ctx.setVisualState('bg', url);
    },
    'music': async (args, ctx, rawArgs) => {
        const url = args[0] || rawArgs;
        if (ctx.setVisualState) ctx.setVisualState('music', url);
    },
    'sound': async (args, ctx, rawArgs) => {
        const url = args[0] || rawArgs;
        if (ctx.setVisualState) ctx.setVisualState('sound', url);
    },
    
    // --- PLACEHOLDERS ---
    'label': async () => {}, // No-op during execution
    'stop': async () => false, // Abort signal
};

// --- MAIN EXECUTOR ---

export const executeScript = async (script: string, context: ScriptContext): Promise<void> => {
    // 1. Pre-process Script
    // Protect quoted pipes, split commands
    const protectedScript = script.replace(/"([^"]*)"/g, (match) => match.replace(/\|/g, '%%PIPE%%'));
    const rawCommands = protectedScript.split(/[\n|]+/).map(c => c.trim()).filter(Boolean);

    // 2. Scan Labels
    const labels: Record<string, number> = {};
    rawCommands.forEach((cmd, index) => {
        // Support /label Name or ::Name::
        let labelName = '';
        if (cmd.toLowerCase().startsWith('/label')) {
            const parts = cmd.trim().split(/\s+/);
            if (parts.length > 1) labelName = parts[1];
        } else if (cmd.startsWith('::') && cmd.endsWith('::')) {
            labelName = cmd.slice(2, -2).trim();
        } else if (cmd.startsWith(':')) {
            labelName = cmd.slice(1).trim();
        }

        if (labelName) {
            labels[labelName] = index;
        }
    });

    // 3. Initialize Runtime State
    const execState: ExecutionState = {
        pc: 0,
        commands: rawCommands,
        labels,
        flowStack: [],
        maxSteps: 5000 // Safety limit
    };

    let steps = 0;

    // 4. Execution Loop
    while (execState.pc < execState.commands.length) {
        steps++;
        if (steps > execState.maxSteps) {
            context.log('error', 'Script terminated: Max execution steps reached (Possible infinite loop).');
            break;
        }

        const rawCmd = execState.commands[execState.pc];
        // Move PC before execution so continue/jumps work naturally
        // If a command jumps, it will overwrite this PC.
        const currentPc = execState.pc;
        execState.pc++; 

        // Skip label definitions during runtime
        if (rawCmd.startsWith(':') || rawCmd.toLowerCase().startsWith('/label')) continue;

        // Resolve Macros
        let cleanCmd = rawCmd.replace(/%%PIPE%%/g, '|');
        cleanCmd = resolveMacros(cleanCmd, context);

        const args = parseArguments(cleanCmd);
        if (args.length === 0) continue;

        const commandName = args[0].startsWith('/') ? args[0].slice(1).toLowerCase() : args[0].toLowerCase();
        const commandArgs = args.slice(1);
        const rawArgsString = cleanCmd.substring(cleanCmd.indexOf(args[0]) + args[0].length).trim();

        // --- FLOW CONTROL CHECK ---
        const shouldExecuteCurrent = execState.flowStack.every(block => block.isExecutable);

        // --- IF/ELSE LOGIC ---
        if (commandName === 'if') {
            let isTrue = false;
            if (shouldExecuteCurrent && commandArgs.length >= 3) {
                try {
                    isTrue = evaluateCondition(commandArgs[0], commandArgs[1], commandArgs[2]);
                } catch (e) {}
            }
            execState.flowStack.push({
                type: 'IF',
                isExecutable: shouldExecuteCurrent && isTrue,
                complete: shouldExecuteCurrent && isTrue
            });
            continue;
        }
        if (commandName === 'elseif' || commandName === 'elif') {
            if (execState.flowStack.length === 0) continue;
            const currentBlock = execState.flowStack[execState.flowStack.length - 1];
            const parentExecutable = execState.flowStack.slice(0, -1).every(b => b.isExecutable);

            if (!parentExecutable || currentBlock.complete) {
                currentBlock.isExecutable = false;
            } else {
                let isTrue = false;
                if (commandArgs.length >= 3) {
                    isTrue = evaluateCondition(commandArgs[0], commandArgs[1], commandArgs[2]);
                }
                if (isTrue) {
                    currentBlock.isExecutable = true;
                    currentBlock.complete = true;
                } else {
                    currentBlock.isExecutable = false;
                }
            }
            continue;
        }
        if (commandName === 'else') {
            if (execState.flowStack.length === 0) continue;
            const currentBlock = execState.flowStack[execState.flowStack.length - 1];
            const parentExecutable = execState.flowStack.slice(0, -1).every(b => b.isExecutable);
            
            if (!parentExecutable || currentBlock.complete) {
                currentBlock.isExecutable = false;
            } else {
                currentBlock.isExecutable = true;
                currentBlock.complete = true;
            }
            continue;
        }
        if (commandName === 'endif' || commandName === 'fi') {
            if (execState.flowStack.length > 0) execState.flowStack.pop();
            continue;
        }

        // --- ACTION EXECUTION ---
        if (shouldExecuteCurrent) {
            if (commands[commandName]) {
                try {
                    const result = await commands[commandName](commandArgs, context, rawArgsString, execState);
                    if (result === false) break; // Stop signal
                } catch (e) {
                    context.log('error', `Error executing /${commandName}: ${e instanceof Error ? e.message : String(e)}`);
                }
            } else if (!commandName.startsWith('/')) {
                // Implicit send
                context.sendMessage(cleanCmd, 'user');
            }
        }
    }
};
