
import React, { useRef, useEffect, useState, useLayoutEffect, memo } from 'react';
import type { ChatMessage, TavernHelperScript } from '../../types';
import { InteractiveHtmlMessage } from '../InteractiveHtmlMessage';
import { MessageBubble, ThinkingReveal, MessageMenu } from './MessageBubble';
import { Loader } from '../Loader';
import { usePreset } from '../../contexts/PresetContext'; 
import { useToast } from '../ToastSystem';
import { cleanMessageContent } from '../../services/promptManager';
import { useTTS } from '../../contexts/TTSContext';

// --- Standalone TTS Button for Interactive Messages ---
const StandaloneTTSButton: React.FC<{ 
    rawContent: string; 
    voice: string;
    provider: 'gemini' | 'native';
    rate: number;
    pitch: number;
    nativeVoice: string;
}> = ({ rawContent, voice, provider, rate, pitch, nativeVoice }) => {
    const { showToast } = useToast();
    const { playImmediately } = useTTS();

    const handlePlay = async () => {
        // Clean content for reading: Remove thinking blocks, HTML, etc.
        const cleanText = cleanMessageContent(rawContent).replace(/<[^>]*>/g, '');
        
        if (!cleanText.trim()) {
            showToast("Không có nội dung văn bản để đọc.", 'warning');
            return;
        }

        try {
            // Use props passed from Global Settings
            const usedVoice = provider === 'native' ? nativeVoice : voice;
            playImmediately(cleanText, usedVoice, `interactive-${Date.now()}`, {
                provider,
                rate,
                pitch
            });
        } catch (e) {
            showToast(`TTS Error: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    };

    return (
        <button 
            onClick={handlePlay}
            className={`p-1.5 rounded-full shadow-lg border transition-all transform hover:scale-110 bg-slate-800/90 text-slate-400 border-slate-600 hover:text-sky-400 hover:border-sky-500 backdrop-blur-sm`}
            title="Đọc nội dung (TTS)"
            aria-label="Đọc nội dung (TTS)"
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
        </button>
    );
};

interface MessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    isImmersive: boolean;
    
    // Character / User Info
    characterName: string;
    characterAvatarUrl: string | null;
    userPersonaName: string;
    characterId: string;
    sessionId: string;
    
    // Editing State
    editingMessageId: string | null;
    editingContent: string;
    setEditingContent: (content: string) => void;
    onStartEdit: (msg: ChatMessage) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;

    // Actions
    regenerateLastResponse: () => void;
    deleteLastTurn: () => void;
    onDeleteMessage: (messageId: string) => void;
    onOpenAuthorNote: () => void;
    onOpenWorldInfo: () => void;
    
    // NEW: Arena Callback
    onArenaSelect: (id: string, selection: 'A' | 'B') => void;
    onArenaRetry: (id: string, selection: 'A' | 'B') => void;

    // Data
    scripts: TavernHelperScript[];
    variables: any;
    extensionSettings: any;
    
    // Refs
    iframeRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>;
    onIframeLoad: (id: string) => void;
}

const MessageListComponent: React.FC<MessageListProps> = ({
    messages,
    isLoading,
    isImmersive,
    characterName,
    characterAvatarUrl,
    userPersonaName,
    characterId,
    sessionId,
    editingMessageId,
    editingContent,
    setEditingContent,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    regenerateLastResponse,
    deleteLastTurn,
    onDeleteMessage,
    onOpenAuthorNote,
    onOpenWorldInfo,
    onArenaSelect, // Used here
    onArenaRetry, // Used here
    scripts,
    variables,
    extensionSettings,
    iframeRefs,
    onIframeLoad
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null); 
    const prevMessagesLengthRef = useRef(messages.length);
    const lastMessageIdRef = useRef<string | null>(messages.length > 0 ? messages[messages.length - 1].id : null);
    
    // Load Global TTS Settings
    const { settings: ttsSettings } = useTTS();
    const ttsEnabled = ttsSettings.tts_enabled;
    const ttsVoice = ttsSettings.tts_voice || 'Kore';
    const ttsProvider = ttsSettings.tts_provider || 'gemini';
    const ttsNativeVoice = ttsSettings.tts_native_voice || '';
    const ttsRate = ttsSettings.tts_rate ?? 1;
    const ttsPitch = ttsSettings.tts_pitch ?? 1;
    
    // --- LOAD MORE LOGIC ---
    const [visibleCount, setVisibleCount] = useState(10); 
    const prevScrollHeightRef = useRef<number>(0); 

    useEffect(() => {
        setVisibleCount(10);
    }, [sessionId]);

    const handleLoadMore = () => {
        if (containerRef.current) {
            prevScrollHeightRef.current = containerRef.current.scrollHeight;
        }
        setVisibleCount(prev => prev + 10);
    };

    useLayoutEffect(() => {
        if (containerRef.current && prevScrollHeightRef.current > 0) {
            const newScrollHeight = containerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop += heightDifference;
            prevScrollHeightRef.current = 0;
        }
    }, [visibleCount]);

    const displayedMessages = messages.slice(-visibleCount);
    const hasMoreMessages = messages.length > visibleCount;

    // --- SMART SCROLL LOGIC ---
    useEffect(() => {
        const isNewMessage = messages.length > prevMessagesLengthRef.current;
        const currentLastId = messages.length > 0 ? messages[messages.length - 1].id : null;
        const isLastIdChanged = currentLastId !== lastMessageIdRef.current;

        if ((isNewMessage || isLastIdChanged) && !editingMessageId) {
            setTimeout(() => {
                 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        prevMessagesLengthRef.current = messages.length;
        lastMessageIdRef.current = currentLastId;
    }, [messages, editingMessageId]); 

    // Calculate Last Model Index (Global)
    let lastModelMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'model') {
            lastModelMsgIndex = i;
            break;
        }
    }
    const lastMessageIndex = messages.length - 1;

    return (
        <div 
            ref={containerRef}
            className={`flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar relative z-10 w-full ${isImmersive ? 'max-w-5xl mx-auto transition-all' : ''}`}
            // REMOVED: aria-live="polite" to prevent full container updates from interrupting screen readers during streaming
        >
            {hasMoreMessages && (
                <div className="flex justify-center mb-4">
                    <button 
                        onClick={handleLoadMore}
                        className="text-xs text-slate-500 hover:text-sky-400 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full transition-colors border border-slate-700/50"
                    >
                        Tải thêm tin nhắn cũ ({Math.min(10, messages.length - visibleCount)}/{(messages.length - visibleCount)})
                    </button>
                </div>
            )}

            {displayedMessages.map((msg, index) => {
                const startIndex = messages.length - displayedMessages.length;
                const originalIndex = startIndex + index;
                
                const isLastMessage = originalIndex === lastMessageIndex;
                const isLastModelMessage = originalIndex === lastModelMsgIndex;
                
                const canRegenerate = !isLoading && msg.role !== 'system' && (isLastModelMessage || isLastMessage);
                const canDelete = !isLoading;

                // --- RAW STREAMING LOGIC ---
                const isStreaming = isLoading && isLastMessage && msg.role === 'model';

                const menuActions = [
                    { label: 'Chỉnh sửa', onClick: () => onStartEdit(msg) },
                    { label: 'Ghi chú của Tác giả', onClick: onOpenAuthorNote },
                    { label: 'Quản lý World Info', onClick: onOpenWorldInfo },
                    { 
                        label: msg.role === 'user' ? 'Gửi lại (Tạo lại)' : 'Tạo lại phản hồi', 
                        onClick: regenerateLastResponse, 
                        disabled: !canRegenerate 
                    },
                    { 
                        label: 'Xóa từ đây (Tua lại)', 
                        onClick: () => onDeleteMessage(msg.id), 
                        disabled: !canDelete, 
                        className: 'text-red-400 hover:bg-red-800/50' 
                    },
                ];

                if (!msg.content.trim() && !msg.interactiveHtml && !msg.arena && editingMessageId !== msg.id) return null;

                return (
                    <div key={msg.id} className="group relative flex flex-col gap-2 my-4">
                        {(msg.content.trim() || msg.arena || editingMessageId === msg.id) && (
                            <MessageBubble 
                                message={msg} 
                                avatarUrl={characterAvatarUrl}
                                isEditing={editingMessageId === msg.id}
                                editingContent={editingContent}
                                onContentChange={setEditingContent}
                                onSave={onSaveEdit}
                                onCancel={onCancelEdit}
                                menuActions={menuActions}
                                isImmersive={isImmersive}
                                isStreaming={isStreaming} 
                                onArenaSelect={onArenaSelect} // PASSED DOWN
                                onArenaRetry={onArenaRetry} // PASSED DOWN
                            />
                        )}

                        {msg.interactiveHtml && (
                            <div className="relative w-full">
                                {(!msg.content.trim() && editingMessageId !== msg.id) && (
                                    <div className="absolute top-0 right-0 z-20 flex items-center gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                                        {ttsEnabled && (
                                            <StandaloneTTSButton 
                                                rawContent={msg.originalRawContent || msg.interactiveHtml} 
                                                voice={ttsVoice}
                                                provider={ttsProvider}
                                                nativeVoice={ttsNativeVoice}
                                                rate={ttsRate}
                                                pitch={ttsPitch}
                                            />
                                        )}
                                        <div className="bg-slate-800/90 rounded-full shadow-md backdrop-blur-sm border border-slate-600/50">
                                            <MessageMenu actions={menuActions} isUser={false} />
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    let finalHtml = msg.interactiveHtml;
                                    let thinkingContent: string | null = null;
                                    const thinkingMatch = finalHtml.match(/<thinking>([\s\S]*?)<\/thinking>/i);
                                    if (thinkingMatch) {
                                        thinkingContent = thinkingMatch[1].trim();
                                        finalHtml = finalHtml.replace(thinkingMatch[0], '');
                                    }
                                    
                                    return (
                                        <>
                                            {thinkingContent && (
                                                <div className="mb-2">
                                                    <ThinkingReveal content={thinkingContent} />
                                                </div>
                                            )}
                                            <InteractiveHtmlMessage 
                                              ref={(el) => { iframeRefs.current[msg.id] = el; }}
                                              htmlContent={finalHtml} 
                                              scripts={scripts}
                                              originalContent={msg.originalRawContent || ''}
                                              initialData={variables}
                                              extensionSettings={extensionSettings} 
                                              onLoad={() => onIframeLoad(msg.id)}
                                              characterName={characterName}
                                              userPersonaName={userPersonaName}
                                              characterId={characterId} 
                                              chatId={sessionId}
                                              chatHistory={messages}
                                              userAvatarUrl={characterAvatarUrl || undefined}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {isLoading && (
                <div className="flex items-start gap-3 my-4 flex-row">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden">
                       {characterAvatarUrl && <img src={characterAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />}
                    </div>
                    <div className={`rounded-lg px-4 py-2 max-w-lg bg-slate-700/90 text-slate-200 rounded-bl-none ${isImmersive ? 'backdrop-blur-md' : ''}`}>
                       <Loader message="Đang phân tích bối cảnh & tạo câu trả lời..." />
                     </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export const MessageList = memo(MessageListComponent);
