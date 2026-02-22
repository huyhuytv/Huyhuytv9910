
import { useCallback, useEffect } from 'react';
import type { SystemLogEntry, WorldInfoEntry, PromptSection, ChatTurnLog } from '../types';
import { LOG_EVENT_NAME, LogEventDetail } from '../services/logBridge';
import { useChatStore } from '../store/chatStore';

export const useChatLogger = () => {
    const { 
        logs, 
        addLogTurn, 
        updateCurrentTurn, 
        addSystemLog, 
        addWorldInfoLog, 
        addSmartScanLog, 
        addMythicLog,
        clearLogs 
    } = useChatStore();

    const startTurn = useCallback(() => {
        const newTurn: ChatTurnLog = { timestamp: Date.now(), prompt: [], response: '', systemLogs: [] };
        addLogTurn(newTurn);
    }, [addLogTurn]);

    const logPrompt = useCallback((promptData: PromptSection[] | string) => {
        const promptSections: PromptSection[] = typeof promptData === 'string' 
            ? [{ id: 'legacy_raw', name: 'Raw Prompt', content: promptData, role: 'system' }] 
            : promptData;
        
        updateCurrentTurn({ prompt: promptSections });
    }, [updateCurrentTurn]);

    const logResponse = useCallback((response: string) => {
        updateCurrentTurn({ response });
    }, [updateCurrentTurn]);

    const logSummary = useCallback((summary: string) => {
        updateCurrentTurn({ summary });
    }, [updateCurrentTurn]);
    
    const logSystemMessage = useCallback((
        level: SystemLogEntry['level'], 
        source: SystemLogEntry['source'],
        message: string, 
        stack?: string, 
        payload?: string
    ) => {
        const newEntry: SystemLogEntry = { 
            level, 
            source,
            message, 
            stack, 
            payload, 
            timestamp: Date.now() 
        };
        
        addSystemLog(newEntry);
        
        // Also add to current turn logs via updateCurrentTurn (Store handles the merge)
        updateCurrentTurn({ systemLogs: [newEntry] });
    }, [addSystemLog, updateCurrentTurn]);

    // Listen for Global Events (Bridge)
    useEffect(() => {
        const handleGlobalLog = (e: Event) => {
            const customEvent = e as CustomEvent<LogEventDetail>;
            const { level, source, message, stack, payload } = customEvent.detail;
            
            let payloadStr = payload;
            if (typeof payload === 'object' && payload !== null) {
                try {
                    payloadStr = JSON.stringify(payload, null, 2);
                } catch {
                    payloadStr = String(payload);
                }
            }

            logSystemMessage(level, source, message, stack, payloadStr);
        };

        window.addEventListener(LOG_EVENT_NAME, handleGlobalLog);
        return () => {
            window.removeEventListener(LOG_EVENT_NAME, handleGlobalLog);
        };
    }, [logSystemMessage]);

    const logDiagnostic = useCallback((logText: string, source: 'regex' | 'variable' = 'regex') => {
        if (!logText) return;
        const lines = logText.split('\n');
        const now = Date.now();
        const entries: SystemLogEntry[] = [];

        lines.forEach((line, index) => {
            const cleanLine = line.trim();
            if (!cleanLine) return;
            let level: SystemLogEntry['level'] = 'log';
            if (cleanLine.includes('[ERR]') || cleanLine.includes('[LỖI]') || cleanLine.includes('Error')) level = 'error';
            else if (cleanLine.includes('[WARN]') || cleanLine.includes('Cảnh báo')) level = 'warn';
            else if (cleanLine.includes('[OK]') || cleanLine.includes('-> [OK]')) level = 'script-success';
            else if (cleanLine.includes('[START]') || cleanLine.includes('[END]')) level = 'state';
            else if (cleanLine.includes('Kết quả mới:')) level = 'interaction';

            entries.push({ level, source, message: cleanLine, timestamp: now + index });
        });

        // Add each entry
        entries.forEach(e => addSystemLog(e));
        updateCurrentTurn({ systemLogs: entries.reverse() }); // Update turn log
    }, [addSystemLog, updateCurrentTurn]);
    
    const logWorldInfo = useCallback((entries: WorldInfoEntry[]) => {
        if (entries.length === 0) {
            addWorldInfoLog("Không có mục World Info nào được kích hoạt.");
            return;
        }
        const formattedLog = entries.map((e, index) => 
            `${index + 1}. [${e.comment || 'Không tên'}] (UID: ${e.uid})\n   Keys: ${e.keys.join(', ')}\n   Order: ${e.insertion_order || 0}`
        ).join('\n\n');
        addWorldInfoLog(formattedLog);
    }, [addWorldInfoLog]);

    const logSmartScan = useCallback((fullPrompt: string, rawResponse: string, latency: number) => {
        const logEntry = JSON.stringify({
            latency,
            fullPrompt,
            rawResponse
        });
        addSmartScanLog(logEntry);
    }, [addSmartScanLog]);

    const logMythic = useCallback((fullPrompt: string, rawResponse: string, latency: number) => {
        const logEntry = JSON.stringify({
            latency,
            fullPrompt,
            rawResponse
        });
        addMythicLog(logEntry);
    }, [addMythicLog]);
    
    const clearSystemLogs = useCallback(() => {
        // Implementation left empty or add specific action if needed
        // For now clearLogs does everything
    }, []);

    return {
        logs,
        startTurn,
        logPrompt,
        logResponse,
        logSummary,
        logDiagnostic,
        logWorldInfo,
        logSmartScan,
        logMythic,
        logSystemMessage,
        clearLogs,
        clearSystemLogs,
    };
};
