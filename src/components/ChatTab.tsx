import React from 'react';
import { ChatLobby } from './ChatLobby';
import { ChatTester } from './ChatTester';

interface ChatTabProps {
    activeSessionId: string | null;
    onSessionSelect: (sessionId: string) => void;
    onCloseSession: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ activeSessionId, onSessionSelect, onCloseSession }) => {
    if (activeSessionId) {
        return (
            <ChatTester 
                sessionId={activeSessionId} 
                onBack={onCloseSession} 
            />
        );
    }

    return <ChatLobby onSessionSelect={onSessionSelect} />;
};