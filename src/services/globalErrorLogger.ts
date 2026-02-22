
import { dispatchSystemLog } from './logBridge';

let isInitialized = false;
let isLoggingInternally = false; // Flag to prevent infinite loops if logger itself errors

/**
 * Intercepts console.error, console.warn, and console.log to capture silent errors from libraries.
 */
const interceptConsole = () => {
    const originalError = console.error;
    const originalWarn = console.warn;
    // We can also intercept console.log if needed, but it might be too noisy.
    // const originalLog = console.log;

    console.error = (...args: any[]) => {
        // Always call the original first to ensure devtools still work
        originalError.apply(console, args);

        if (isLoggingInternally) return;
        
        try {
            isLoggingInternally = true;
            const message = args.map(arg => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return arg.message;
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }).join(' ');

            // Extract stack trace if available in args
            const errorObj = args.find(arg => arg instanceof Error);
            const stack = errorObj ? errorObj.stack : undefined;

            dispatchSystemLog('error', 'console', message, stack);
        } catch (e) {
            // Fallback if logging fails
        } finally {
            isLoggingInternally = false;
        }
    };

    console.warn = (...args: any[]) => {
        originalWarn.apply(console, args);

        if (isLoggingInternally) return;

        try {
            isLoggingInternally = true;
            const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
            dispatchSystemLog('warn', 'console', message);
        } catch (e) {
            // Fallback
        } finally {
            isLoggingInternally = false;
        }
    };
};

/**
 * Captures resource loading errors (img, script, link) using capture phase.
 * These errors do not bubble to window.onerror.
 */
const captureResourceErrors = () => {
    window.addEventListener('error', (event: Event) => {
        // Check if the target is an HTML Element (Resource Error)
        // Standard JS Errors bubble to window.onerror, but Resource errors don't bubble.
        // However, with useCapture=true, we see ALL errors.
        // We need to distinguish between a Script execution error (handled by window.onerror) and a Resource error.
        
        const target = event.target as HTMLElement;
        
        if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'AUDIO' || target.tagName === 'VIDEO')) {
            const src = (target as any).src || (target as any).href || 'unknown source';
            const tagName = target.tagName.toLowerCase();
            
            const message = `Resource Load Failed: <${tagName}> failed to load from '${src}'`;
            
            dispatchSystemLog(
                'error',
                'network',
                message
            );
        }
    }, true); // TRUE = Capture Phase (Crucial for non-bubbling events)
};

export const initGlobalErrorHandling = () => {
    if (isInitialized) return;
    isInitialized = true;

    // 1. Global Runtime Errors (Sync)
    window.onerror = (message, source, lineno, colno, error) => {
        const stack = error?.stack || `${source}:${lineno}:${colno}`;
        dispatchSystemLog(
            'error', 
            'system', 
            `Uncaught Runtime Error: ${message}`, 
            stack
        );
        // Return false to let the default browser console error happen too
        return false; 
    };

    // 2. Global Unhandled Promise Rejections (Async)
    window.onunhandledrejection = (event) => {
        const reason = event.reason;
        let message = 'Unknown Async Error';
        let stack = undefined;

        if (reason instanceof Error) {
            message = reason.message;
            stack = reason.stack;
        } else if (typeof reason === 'string') {
            message = reason;
        } else {
            try {
                message = JSON.stringify(reason);
            } catch {
                message = String(reason);
            }
        }

        dispatchSystemLog(
            'error', 
            'system', 
            `Unhandled Promise Rejection: ${message}`, 
            stack
        );
    };

    // 3. Initialize Advanced Capturing
    interceptConsole();
    captureResourceErrors();

    console.log('[System] Global Error Hunters (Multi-layer) initialized.');
};
