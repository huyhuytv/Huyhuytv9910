
import { useCallback, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { summarizeHistory } from '../services/ai/semanticTasks.ts';
import { dispatchSystemLog } from '../services/logBridge';
import { ChatMessage } from '../types';
import { getGlobalContextSettings } from '../services/settingsService';

/**
 * Counts total turns in the chat history. A turn is typically a user-model exchange.
 */
export const countTotalTurns = (messages: ChatMessage[]): number => {
    return messages.filter(m => m.role === 'model').length;
};

export const useChatMemory = () => {
    // Removed preset from store destructuring, added global fetch
    const { messages, longTermSummaries, setSessionData, card, summaryQueue } = useChatStore();
    const [isSummarizing, setIsSummarizing] = useState(false);

    // --- LOGIC TÓM TẮT MỚI (TẠO MỚI) ---
    const triggerSummarization = useCallback(async () => {
        const globalSettings = getGlobalContextSettings();
        const chunkSize = globalSettings.summarization_chunk_size || 10;
        
        // 1. Xác định chúng ta đang ở đâu trong chuỗi tóm tắt
        // Số lượt đã được tóm tắt = Số lượng tóm tắt hiện có * Kích thước gói
        const totalSummarizedTurns = longTermSummaries.length * chunkSize;

        // 2. Tìm điểm bắt đầu và kết thúc cho gói tóm tắt MỚI (Tiếp theo)
        let startIndex = 0;
        let cutIndex = -1;
        let turnCounter = 0;

        // Tìm vị trí trong mảng messages tương ứng với số lượt
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'model') {
                turnCounter++;
                
                // Nếu đây là lượt cuối cùng của các phần đã tóm tắt trước đó -> Điểm bắt đầu cho phần mới là ngay sau nó
                if (turnCounter === totalSummarizedTurns) {
                    startIndex = i + 1;
                }

                // Nếu đây là lượt cuối cùng của phần CẦN tóm tắt (chunkSize tiếp theo)
                if (turnCounter === totalSummarizedTurns + chunkSize) {
                    cutIndex = i + 1;
                    break; 
                }
            }
        }

        // Nếu chưa đủ số lượt mới để tạo thành một gói tóm tắt hoàn chỉnh -> Hủy
        if (cutIndex === -1) return;

        setIsSummarizing(true);
        dispatchSystemLog('log', 'system', `Smart Context: Đang tóm tắt lượt ${totalSummarizedTurns + 1} đến ${totalSummarizedTurns + chunkSize}...`);

        try {
            // Cắt đoạn tin nhắn cần tóm tắt (KHÔNG XÓA KHỎI STORE)
            const chunkToSummarize = messages.slice(startIndex, cutIndex);
            
            // --- LOAD GLOBAL PROMPT & APPLY ROLLING WINDOW ---
            let promptTemplate = globalSettings.summarization_prompt || '';

            // Calculate Rolling Window (Last 5 summaries)
            const recentSummaries = longTermSummaries.slice(-5).join('\n---\n');
            const placeholder = recentSummaries ? recentSummaries : "(Chưa có bối cảnh trước đó)";

            // Inject into Prompt
            const finalPrompt = promptTemplate.replace('{{recent_summaries}}', placeholder);
            // --------------------------------------------------

            const summary = await summarizeHistory(
                chunkToSummarize, 
                card?.name || 'Character',
                finalPrompt // Use the processed global prompt
            );
            
            if (summary) {
                const newSummaries = [...longTermSummaries, summary];
                
                // Cập nhật Store: CHỈ THÊM TÓM TẮT, KHÔNG XÓA MESSAGES
                setSessionData({ 
                    longTermSummaries: newSummaries
                });
                
                dispatchSystemLog('script-success', 'system', `Đã lưu tóm tắt #${newSummaries.length} vào bộ nhớ dài hạn.`);
            }
        } catch (e) {
            dispatchSystemLog('error', 'system', `Lỗi tóm tắt dữ liệu: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsSummarizing(false);
        }
    }, [messages, longTermSummaries, card, setSessionData]);

    // --- LOGIC TẠO LẠI (REGENERATE) ---
    const handleRegenerateSummary = useCallback(async (index: number) => {
        const globalSettings = getGlobalContextSettings();
        const chunkSize = globalSettings.summarization_chunk_size || 10;
        
        // Tính toán phạm vi lượt (Turn range) tương ứng với Index
        const targetStartTurnCount = index * chunkSize;
        const targetEndTurnCount = (index + 1) * chunkSize;

        let startIndex = 0;
        let endIndex = -1;
        let turnCounter = 0;

        // Quét mảng tin nhắn để tìm index thực tế
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'model') {
                turnCounter++;
                
                // Tìm điểm bắt đầu (Ngay sau lượt kết thúc của block trước)
                if (turnCounter === targetStartTurnCount) {
                    startIndex = i + 1;
                }
                
                // Tìm điểm kết thúc
                if (turnCounter === targetEndTurnCount) {
                    endIndex = i + 1;
                    break;
                }
            }
        }

        if (index === 0) startIndex = 0;

        if (endIndex === -1) {
            dispatchSystemLog('error', 'system', `Không tìm thấy đủ dữ liệu gốc để tạo lại tóm tắt #${index + 1}.`);
            return;
        }

        dispatchSystemLog('log', 'system', `Đang tạo lại tóm tắt #${index + 1} (Dựa trên dữ liệu gốc)...`);

        try {
            const chunkToSummarize = messages.slice(startIndex, endIndex);
            
            // --- LOAD GLOBAL PROMPT & APPLY ROLLING WINDOW (FOR REGENERATE) ---
            let promptTemplate = globalSettings.summarization_prompt || '';

            // Calculate Rolling Window based on the SPECIFIC index being regenerated
            // We need the 5 summaries BEFORE this index.
            const previousSummaries = longTermSummaries.slice(0, index).slice(-5);
            const recentText = previousSummaries.join('\n---\n');
            const placeholder = recentText ? recentText : "(Chưa có bối cảnh trước đó)";
            
            const finalPrompt = promptTemplate.replace('{{recent_summaries}}', placeholder);
            // ------------------------------------------------------------------

            const newSummaryContent = await summarizeHistory(
                chunkToSummarize, 
                card?.name || 'Character',
                finalPrompt
            );

            if (newSummaryContent) {
                // Cập nhật mảng tóm tắt tại vị trí index
                const updatedSummaries = [...longTermSummaries];
                updatedSummaries[index] = newSummaryContent;

                setSessionData({ 
                    longTermSummaries: updatedSummaries 
                });

                dispatchSystemLog('script-success', 'system', `Đã cập nhật lại nội dung tóm tắt #${index + 1}.`);
            }
        } catch (e) {
            dispatchSystemLog('error', 'system', `Lỗi tạo lại tóm tắt: ${e instanceof Error ? e.message : String(e)}`);
        }

    }, [messages, longTermSummaries, card, setSessionData]);

    return { 
        isSummarizing, 
        triggerSummarization,
        triggerSmartContext: triggerSummarization,
        handleRegenerateSummary,
        handleRetryFailedTask: async () => {
            console.log("Retry failed summarization task - Not implemented yet");
        },
        queueLength: summaryQueue?.length || 0,
        summaryQueue: summaryQueue || []
    };
};
