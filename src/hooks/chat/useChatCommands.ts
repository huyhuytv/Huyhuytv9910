
import { useCallback } from 'react';
import { executeScript, ScriptContext } from '../../services/stScriptEngine';
import type { CharacterCard, UserPersona, QuickReply } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface ChatCommandsProps {
    // Refs
    card: CharacterCard | null;
    persona: UserPersona | null;
    
    // Services
    saveSession: (data: any) => Promise<void>;
    sendMessage: (content: string) => void;
    addSystemMessage: (content: string) => void;
    logSystemMessage: (level: any, source: any, message: string, stack?: string, payload?: any) => void;
    
    // UI Actions
    updateVisualState: (type: 'bg' | 'music' | 'sound' | 'class', value: string) => void;
    showToast: (message: string, type?: 'info'|'success'|'error') => void;
    showPopup: (content: string, title?: string) => void;
}

export const useChatCommands = ({
    card,
    persona,
    saveSession,
    sendMessage,
    addSystemMessage,
    logSystemMessage,
    updateVisualState,
    showToast,
    showPopup,
}: ChatCommandsProps) => {

    const {
        variables,
        setVariables,
        setQuickReplies,
        setIsInputLocked
    } = useChatStore();

    const executeSlashCommands = useCallback(async (script: string) => {
        if (!script.trim()) return;

        // Current state access inside callback to ensure freshness if called consecutively
        const currentVariables = useChatStore.getState().variables;

        const context: ScriptContext = {
            variables: currentVariables,
            setVariables: (newVars) => {
                setVariables(newVars);
                saveSession({ variables: newVars });
            },
            sendMessage: (content, role = 'user') => {
                if (role === 'user') sendMessage(content);
                else addSystemMessage(content);
            },
            triggerSystemAction: (action, data) => {
                logSystemMessage('interaction', 'system', `System Action: ${action}`, undefined, data);
            },
            characterName: card?.name || 'Character',
            userPersonaName: persona?.name || 'User',
            log: (level, msg) => {
                let mappedLevel: any = 'log';
                if (level === 'error') mappedLevel = 'error';
                else if (level === 'warn') mappedLevel = 'warn';
                logSystemMessage(mappedLevel, 'script', msg);
            },
            setVisualState: updateVisualState,
            showToast: showToast,
            showPopup: showPopup,
            setQuickReplies: setQuickReplies,
            setIsInputLocked: setIsInputLocked 
        };

        await executeScript(script, context);
    }, [
        card, persona, 
        saveSession, sendMessage, addSystemMessage, 
        logSystemMessage, updateVisualState, showToast, showPopup, 
        setVariables, setQuickReplies, setIsInputLocked
    ]);

    return {
        executeSlashCommands
    };
};
