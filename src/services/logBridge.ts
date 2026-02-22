
import type { SystemLogEntry } from '../types';

export const LOG_EVENT_NAME = 'sillytavern:system-log';

export interface LogEventDetail {
    level: SystemLogEntry['level'];
    source: SystemLogEntry['source'];
    message: string;
    stack?: string;
    payload?: any;
}

/**
 * Dispatches a system log event globally.
 * This allows global error handlers and non-React services to write to the Console.
 */
export const dispatchSystemLog = (
    level: SystemLogEntry['level'],
    source: SystemLogEntry['source'],
    message: string,
    stack?: string,
    payload?: any
) => {
    const event = new CustomEvent<LogEventDetail>(LOG_EVENT_NAME, {
        detail: { level, source, message, stack, payload }
    });
    window.dispatchEvent(event);
};
