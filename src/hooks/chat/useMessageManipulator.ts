
import { useCallback } from 'react';
import type { CharacterCard, SillyTavernPreset, ChatMessage } from '../../types';
import { parseLooseJson } from '../../utils';
import { useChatStore } from '../../store/chatStore';
import { syncDatabaseToLorebook } from '../../services/medusaService';
import { countTotalTurns } from '../useChatMemory';
import { getGlobalContextSettings } from '../../services/settingsService'; // NEW Import

interface MessageManipulatorProps {
    saveSession: (data: any) => Promise<void>;
    
    // Dependencies
    card: CharacterCard | null;
    mergedSettings: SillyTavernPreset | null;
    
    // Logging & Status
    logSystemMessage: (level: any, source: any, message: string) => void;
    isBusy: boolean; 
}

export const useMessageManipulator = ({
    saveSession,
    card,
    mergedSettings,
    logSystemMessage,
    isBusy
}: MessageManipulatorProps) => {

    const {
        setMessages,
        setVariables,
        setLastStateBlock,
        setLongTermSummaries,
        setSummaryQueue,
        setSessionData, // Needed to update card.rpg_data and WI state
        setGeneratedLorebookEntries
    } = useChatStore();

    const deleteMessage = useCallback(async (messageId: string) => {
        if (isBusy) return;

        const state = useChatStore.getState();
        const messages = state.messages;
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex === -1) return;

        // Cắt bỏ tin nhắn từ vị trí bị xóa trở đi
        const newMessages = messages.slice(0, messageIndex);
        
        // 1. Khôi phục Biến số (Variable Snapshot)
        let restoredVariables = {}; 
        let foundVarSnapshot = false;

        for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].contextState) {
                restoredVariables = JSON.parse(JSON.stringify(newMessages[i].contextState));
                foundVarSnapshot = true;
                break;
            }
        }

        if (!foundVarSnapshot && card?.char_book?.entries) {
             const initVarEntry = card.char_book.entries.find(e => e.comment?.includes('[InitVar]'));
             if (initVarEntry?.content) {
                 try { 
                     restoredVariables = parseLooseJson(initVarEntry.content); 
                 } catch (e) {}
             }
        }

        // 2. Khôi phục Visual State (HTML)
        let restoredStateBlock = '';
        for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].interactiveHtml) {
                restoredStateBlock = newMessages[i].interactiveHtml!;
                break;
            }
        }
        
        // 3. Khôi phục RPG State (Mythic Engine)
        let restoredRpgState = undefined;
        if (newMessages.length > 0) {
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.rpgState) {
                restoredRpgState = JSON.parse(JSON.stringify(lastMsg.rpgState));
            }
        }
        
        if (restoredRpgState && card) {
             const updatedCard = { ...card, rpg_data: restoredRpgState };
             setSessionData({ card: updatedCard });
             
             // --- FIX: Đồng bộ lại Live-Link ngay lập tức ---
             // Đảm bảo Lorebook được tạo ra khớp với dữ liệu RPG vừa khôi phục
             try {
                const generatedEntries = syncDatabaseToLorebook(restoredRpgState);
                setGeneratedLorebookEntries(generatedEntries);
                logSystemMessage('state', 'system', `RPG State restored & Synced ${generatedEntries.length} Live-Link entries.`);
             } catch(e) {
                 console.warn("Failed to sync Lorebook during rewind", e);
             }
             // -----------------------------------------------
        }

        // 4. Khôi phục World Info State (Cooldowns & Toggles) - NEW
        let restoredWIRuntime = {};
        let restoredWIState = {};
        let foundWISnapshot = false;

        for (let i = newMessages.length - 1; i >= 0; i--) {
            // Find last snapshot of WI. Usually in User messages or System messages.
            if (newMessages[i].worldInfoRuntime) {
                restoredWIRuntime = JSON.parse(JSON.stringify(newMessages[i].worldInfoRuntime));
                if (newMessages[i].worldInfoState) {
                    restoredWIState = JSON.parse(JSON.stringify(newMessages[i].worldInfoState));
                }
                foundWISnapshot = true;
                break;
            }
        }
        
        if (foundWISnapshot) {
            setSessionData({ 
                worldInfoRuntime: restoredWIRuntime,
                worldInfoState: restoredWIState
            });
            logSystemMessage('state', 'system', 'World Info Cooldowns & State restored.');
        } else {
            // Fallback: If no snapshot found (start of chat), reset to empty
            setSessionData({ worldInfoRuntime: {} });
        }

        // 5. [Strict Context Restoration] Tính toán lại và Cắt bớt Tóm tắt
        // Mục tiêu: Khôi phục ngữ cảnh raw tối đa. Nếu số lượt hiện tại < Ngưỡng, xóa sạch tóm tắt.
        let updatedSummaries = state.longTermSummaries;

        // Use Global Settings instead of Merged Settings for Context Logic
        const globalContext = getGlobalContextSettings();
        const contextDepth = globalContext.context_depth || 24;
        const chunkSize = globalContext.summarization_chunk_size || 12;
        
        // Đếm số lượt thực tế còn lại
        const newTotalTurns = countTotalTurns(newMessages);

        // Công thức: Cần giữ lại bao nhiêu gói tóm tắt để (Số lượt còn lại - Số lượt đã tóm tắt) <= contextDepth?
        // neededSummaries = ceil( (Total - Depth) / Chunk )
        // Ví dụ: Total=20, Depth=24 -> (20-24)/10 = -0.4 -> 0 gói (Xóa hết).
        // Ví dụ: Total=40, Depth=24, Chunk=10 -> (40-24)/10 = 1.6 -> 2 gói.
        //    -> 2 gói tóm tắt 20 lượt. Còn lại 20 lượt raw. 20 <= 24. OK.
        
        const neededSummariesCount = Math.max(0, Math.ceil((newTotalTurns - contextDepth) / chunkSize));

        // Nếu số gói cần thiết ít hơn số gói hiện có -> Cắt bớt
        if (neededSummariesCount < updatedSummaries.length) {
            updatedSummaries = updatedSummaries.slice(0, neededSummariesCount);
            setLongTermSummaries(updatedSummaries);
            setSummaryQueue([]); 
            
            logSystemMessage('system', 'system', `[Context Restore] Total Turns: ${newTotalTurns}. Pruned summaries to ${updatedSummaries.length} (was ${state.longTermSummaries.length}) to restore raw context.`);
        }

        // 6. Áp dụng State mới
        setVariables(restoredVariables);
        setLastStateBlock(restoredStateBlock);
        setMessages(newMessages);
        
        logSystemMessage('interaction', 'system', `Rewound chat to before message index ${messageIndex}. All states restored.`);

        // 7. Lưu Session
        await saveSession({
            messages: newMessages,
            variables: restoredVariables,
            lastStateBlock: restoredStateBlock,
            longTermSummaries: updatedSummaries, // Lưu danh sách tóm tắt mới
            summaryQueue: [], // Xóa queue
            generatedLorebookEntries: restoredRpgState ? syncDatabaseToLorebook(restoredRpgState) : [] 
        });

    }, [card, mergedSettings, isBusy, saveSession, setMessages, setVariables, setLastStateBlock, setLongTermSummaries, setSummaryQueue, setSessionData, setGeneratedLorebookEntries, logSystemMessage]);

    const deleteLastTurn = useCallback(async () => {
        const messages = useChatStore.getState().messages;
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        let targetId = lastMsg.id;

        if (lastMsg.role === 'model' && messages.length >= 2) {
            const secondLast = messages[messages.length - 2];
            if (secondLast.role === 'user') {
                targetId = secondLast.id; 
            }
        }
        
        await deleteMessage(targetId);
    }, [deleteMessage]);

    const editMessage = useCallback(async (messageId: string, newContent: string) => {
        const state = useChatStore.getState();
        const messages = state.messages;
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex === -1) return;
        
        const newMessages = [...messages];
        const updatedMessage = { ...newMessages[messageIndex], content: newContent };
        
        delete updatedMessage.interactiveHtml;
        delete updatedMessage.originalRawContent;
        
        newMessages[messageIndex] = updatedMessage;
        setMessages(newMessages);
        await saveSession({ messages: newMessages });
    }, [saveSession, setMessages]);

    return {
        deleteMessage,
        deleteLastTurn,
        editMessage
    };
};
