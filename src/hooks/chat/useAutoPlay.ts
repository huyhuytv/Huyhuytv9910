
import { useEffect } from 'react';
import type { ChatMessage, SillyTavernPreset } from '../../types';

interface UseAutoPlayProps {
    isAutoLooping: boolean;
    isGenerating: boolean;
    isScanning: boolean;
    isSummarizing: boolean;
    messages: ChatMessage[];
    sendMessage: (content: string) => void;
    preset: SillyTavernPreset | null;
}

export const useAutoPlay = ({
    isAutoLooping,
    isGenerating,
    isScanning,
    isSummarizing,
    messages,
    sendMessage,
    preset
}: UseAutoPlayProps) => {

    useEffect(() => {
        // Chỉ chạy khi bật Auto Loop và không có tác vụ nền nào đang chạy
        if (!isAutoLooping || isGenerating || isScanning || isSummarizing || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];

        // Chỉ tự động trả lời khi tin nhắn cuối cùng là của AI
        if (lastMessage.role === 'model') {
            const rawContent = lastMessage.originalRawContent || lastMessage.content || "";
            
            // Trích xuất các lựa chọn có sẵn trong tin nhắn cuối
            const choiceRegex = /\[CHOICE:\s*(?:["'“「])(.*?)(?:["'”」])\s*\]/gi;
            
            const choices: string[] = [];
            let match;
            while ((match = choiceRegex.exec(rawContent)) !== null) {
                if (match[1]) {
                    choices.push(match[1].trim());
                }
            }

            let nextPrompt = "";

            if (choices.length > 0) {
                // Nếu có lựa chọn, chọn ngẫu nhiên một cái
                const randomIndex = Math.floor(Math.random() * choices.length);
                nextPrompt = choices[randomIndex];
            } else {
                // Nếu không có lựa chọn, dùng prompt mặc định "Tiếp tục..."
                nextPrompt = preset?.continue_nudge_prompt || "[Tiếp tục...]";
            }

            // Thêm độ trễ nhỏ để UI kịp render trước khi gửi tin nhắn tiếp theo
            const timer = setTimeout(() => {
                sendMessage(nextPrompt);
            }, 1000); // Delay 1 giây cho tự nhiên
            
            return () => clearTimeout(timer);
        }
    }, [isAutoLooping, isGenerating, isScanning, isSummarizing, messages, sendMessage, preset]);
};
