
import { useCallback, useEffect } from 'react';
import type { ScriptButton } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface ChatInterfaceProps {
    logSystemMessage: (level: any, source: any, message: string) => void;
}

export const useChatInterface = ({ logSystemMessage }: ChatInterfaceProps) => {
    const {
        quickReplies,
        setQuickReplies,
        scriptButtons,
        setScriptButtons,
        isInputLocked,
        setIsInputLocked,
        isAutoLooping,
        setIsAutoLooping
    } = useChatStore();

    // Iframe Event Listener
    useEffect(() => {
        const handleMessageFromIframe = (event: MessageEvent) => {
            if (!event.data || typeof event.data.type !== 'string') {
                return;
            }
            
            if (event.data.type === 'UPDATE_SCRIPT_BUTTONS') {
                if (event.data.payload) {
                    const { scriptId, buttons } = event.data.payload;
                    const processedButtons: ScriptButton[] = (buttons || []).map((btn: any, idx: number) => ({
                        id: `btn_${scriptId}_${idx}`,
                        label: btn.name || btn.label || 'Button',
                        scriptId: scriptId,
                        eventId: 'btn_click_' + (btn.name || btn.label || 'Button')
                    }));
                    
                    logSystemMessage('interaction', 'system', `Updated script buttons for ${scriptId}: ${processedButtons.length} buttons.`);
                    setScriptButtons(processedButtons);
                }
            }
        };
        window.addEventListener('message', handleMessageFromIframe);
        return () => window.removeEventListener('message', handleMessageFromIframe);
    }, [logSystemMessage, setScriptButtons]);

    // Script Button Click Handler
    const handleScriptButtonClick = useCallback((button: ScriptButton) => {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            iframe.contentWindow?.postMessage({
                type: 'EXECUTE_BUTTON_SCRIPT',
                payload: {
                    scriptId: button.scriptId,
                    buttonName: button.label 
                }
            }, '*');
        });
        
        logSystemMessage('interaction', 'system', `Clicked Script Button: ${button.label}`);
    }, [logSystemMessage]);

    return {
        quickReplies,
        setQuickReplies,
        scriptButtons,
        setScriptButtons,
        isInputLocked,
        setIsInputLocked,
        isAutoLooping,
        setIsAutoLooping,
        handleScriptButtonClick
    };
};
