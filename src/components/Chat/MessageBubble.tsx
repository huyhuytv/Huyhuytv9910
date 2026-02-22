
import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import type { ChatMessage } from '../../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useUserPersona } from '../../contexts/UserPersonaContext';
import { useToast } from '../ToastSystem';
import { useTTS } from '../../contexts/TTSContext';

export interface MessageMenuAction {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

export const MessageMenu: React.FC<{
    actions: MessageMenuAction[];
    isUser: boolean;
}> = ({ actions, isUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            const firstButton = menuRef.current?.querySelector('button');
            firstButton?.focus();
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
            triggerRef.current?.focus();
        }
    };

    const validActions = actions.filter(a => a.disabled !== true);
    if (validActions.length === 0) return null;

    return (
        <div className="relative">
            <button 
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)} 
                className="p-1 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Tùy chọn tin nhắn"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>
            {isOpen && (
                <div 
                    ref={menuRef} 
                    onKeyDown={handleKeyDown}
                    className={`absolute z-10 bottom-full mb-1 ${isUser ? 'right-0' : 'left-0'} w-48 bg-slate-900 border border-slate-700 rounded-md shadow-lg py-1`}
                >
                    {validActions.map((action, idx) => (
                        <button
                            key={`${action.label}-${idx}`}
                            onClick={() => { action.onClick(); setIsOpen(false); triggerRef.current?.focus(); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${action.className || 'text-slate-200 hover:bg-slate-700'}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const ThinkingReveal: React.FC<{ content: string; label?: string }> = ({ content, label = 'Quy trình suy nghĩ' }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="mb-4 bg-indigo-900/30 border border-indigo-500/30 rounded-lg overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-900/40 hover:bg-indigo-800/50 flex items-center gap-2 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="text-lg" aria-hidden="true">🧠</span>
                <span>{isOpen ? `Ẩn ${label}` : `Xem ${label}`}</span>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 ml-auto transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-3 text-xs font-mono text-indigo-100 whitespace-pre-wrap border-t border-indigo-500/20 bg-indigo-900/20">
                    {content}
                </div>
            )}
        </div>
    );
};

// --- RENDER CONTENT HELPER (Reused in Arena) ---
const RenderedArenaContent: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
    // OPTIMIZATION: Nếu đang streaming, trả về text thô ngay lập tức để tránh lag do parse markdown liên tục
    if (isStreaming) {
        return (
            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {content}<span className="animate-pulse text-sky-400">▍</span>
            </div>
        );
    }

    const { mainHtml, thinkingBlocks } = useMemo(() => {
        if (!content) return { mainHtml: '', thinkingBlocks: [] };

        const foundThinkingBlocks: { label: string; content: string }[] = [];
        const thinkingRegex = /<(thinking|thinking_requirements|step_outline|plan)>([\s\S]*?)<\/\1>/gi;
        
        let match;
        let extractedContent = content;
        while ((match = thinkingRegex.exec(content)) !== null) {
            const tagName = match[1];
            const innerContent = match[2].trim();
            
            let label = 'Suy nghĩ';
            if (tagName === 'thinking_requirements') label = 'Yêu cầu Suy nghĩ';
            if (tagName === 'step_outline') label = 'Dàn ý Bước đi';
            if (tagName === 'plan') label = 'Kế hoạch';

            foundThinkingBlocks.push({ label, content: innerContent });
            extractedContent = extractedContent.replace(match[0], '');
        }

        const rawHtml = marked.parse(extractedContent.trim()) as string;
        const sanitized = DOMPurify.sanitize(rawHtml, { 
            ADD_TAGS: ['style', 'details', 'summary'],
            ADD_ATTR: ['style', 'class', 'open']
        });
        
        return { mainHtml: sanitized, thinkingBlocks: foundThinkingBlocks };
    }, [content]);

    if (!content) {
        return <span className="animate-pulse opacity-50">Đang khởi tạo...</span>;
    }

    return (
        <>
            {thinkingBlocks.map((block, idx) => (
                <ThinkingReveal key={idx} content={block.content} label={block.label} />
            ))}
            <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: mainHtml }}
            />
        </>
    );
};

// --- ARENA COLUMN (ISOLATED COMPONENT) ---
// This ensures that when Model B streams, Model A doesn't re-render.
interface ArenaColumnProps {
    modelData: { name: string; content: string; completed?: boolean };
    selection: 'A' | 'B';
    colorClass: string;
    onSelect: (selection: 'A' | 'B') => void;
    onRetry: (selection: 'A' | 'B') => void;
}

const ArenaColumn = memo(({ modelData, selection, colorClass, onSelect, onRetry }: ArenaColumnProps) => {
    // Independent streaming state logic
    const isModelStreaming = modelData.completed === false;

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-lg border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-slate-700/50 flex justify-between items-center ${colorClass} bg-opacity-10`}>
                <span className="truncate max-w-[120px]" title={modelData.name}>{modelData.name}</span>
                <div className="flex items-center gap-2">
                    {selection === 'B' && <span className="text-[10px] opacity-70">Challenger</span>}
                    <button 
                        onClick={() => onRetry(selection)}
                        disabled={isModelStreaming}
                        className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                        title="Thử lại model này"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Content */}
            <div className="p-3 text-sm text-slate-300 leading-relaxed flex-grow overflow-y-auto max-h-[400px] custom-scrollbar">
                <RenderedArenaContent content={modelData.content} isStreaming={isModelStreaming} />
            </div>
            
            {/* Action */}
            <div className="p-2 border-t border-slate-700/50 bg-slate-800/30">
                <button
                    onClick={() => onSelect(selection)}
                    disabled={isModelStreaming}
                    className={`w-full py-1.5 rounded text-xs font-bold transition-all active:scale-95 ${colorClass} hover:brightness-110 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isModelStreaming ? 'Đang tạo...' : 'Chọn cái này'}
                </button>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for memoization
    // Only re-render if:
    // 1. Content changes
    // 2. Completion status changes
    // 3. Name changes (rare, but possible on init)
    return (
        prev.modelData.content === next.modelData.content &&
        prev.modelData.completed === next.modelData.completed &&
        prev.modelData.name === next.modelData.name &&
        prev.selection === next.selection // Should be constant but good to check
    );
});

// --- ARENA BUBBLE (SPLIT VIEW) ---
const ArenaBubble: React.FC<{
    message: ChatMessage;
    onSelect: (selection: 'A' | 'B') => void;
    onRetry: (selection: 'A' | 'B') => void;
}> = ({ message, onSelect, onRetry }) => {
    if (!message.arena) return null;

    return (
        <div className="w-full max-w-4xl mx-auto my-4">
            <div className="flex items-center justify-center mb-2">
                <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    ARENA MODE
                </span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <ArenaColumn 
                    modelData={message.arena.modelA} 
                    selection="A" 
                    colorClass="bg-sky-600 text-white" 
                    onSelect={onSelect}
                    onRetry={onRetry} 
                />
                <div className="hidden sm:flex items-center justify-center text-slate-500 font-bold text-xs">VS</div>
                <ArenaColumn 
                    modelData={message.arena.modelB} 
                    selection="B" 
                    colorClass="bg-purple-600 text-white" 
                    onSelect={onSelect}
                    onRetry={onRetry} 
                />
            </div>
        </div>
    );
};

interface MessageBubbleProps {
    message: ChatMessage;
    avatarUrl: string | null;
    isEditing: boolean;
    editingContent: string;
    onContentChange: (content: string) => void;
    onSave: () => void;
    onCancel: () => void;
    menuActions: MessageMenuAction[];
    isImmersive: boolean;
    isStreaming?: boolean; // Flag for raw streaming (Standard mode)
    onArenaSelect?: (id: string, selection: 'A' | 'B') => void;
    onArenaRetry?: (id: string, selection: 'A' | 'B') => void;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ 
    message, 
    avatarUrl, 
    isEditing, 
    editingContent, 
    onContentChange, 
    onSave, 
    onCancel, 
    menuActions, 
    isImmersive,
    isStreaming = false,
    onArenaSelect
}) => {
    const { activePersona } = useUserPersona();
    const { showToast } = useToast();
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // TTS Context Usage
    const { playImmediately, currentPlayingId, settings: ttsSettings } = useTTS();
    const isPlayingThis = currentPlayingId === message.id;

    // Use Global Settings for TTS
    const ttsEnabled = ttsSettings.tts_enabled;
    const ttsVoice = ttsSettings.tts_voice || 'Kore';
    const ttsProvider = ttsSettings.tts_provider || 'gemini';
    const ttsNativeVoice = ttsSettings.tts_native_voice || '';
    const ttsRate = ttsSettings.tts_rate ?? 1;
    const ttsPitch = ttsSettings.tts_pitch ?? 1;

    // Check for active Arena Mode state
    const isArenaActive = message.arena && message.arena.enabled && message.arena.selected === null;

    const { mainHtml, thinkingBlocks } = useMemo(() => {
        // PERFORMANCE OPTIMIZATION:
        // If streaming OR Arena Active, skip heavy parsing completely. Return placeholders.
        if (isUser || !message.content || isStreaming || isArenaActive) {
            return { mainHtml: '', thinkingBlocks: [] };
        }

        let contentToRender = message.content;
        if (activePersona) {
            contentToRender = contentToRender.replace(/{{user}}/gi, activePersona.name);
        }

        const foundThinkingBlocks: { label: string; content: string }[] = [];
        const thinkingRegex = /<(thinking|thinking_requirements|step_outline|plan)>([\s\S]*?)<\/\1>/gi;
        
        let match;
        let extractedContent = contentToRender;
        while ((match = thinkingRegex.exec(contentToRender)) !== null) {
            const tagName = match[1];
            const innerContent = match[2].trim();
            
            let label = 'Suy nghĩ';
            if (tagName === 'thinking_requirements') label = 'Yêu cầu Suy nghĩ';
            if (tagName === 'step_outline') label = 'Dàn ý Bước đi';
            if (tagName === 'plan') label = 'Kế hoạch';

            foundThinkingBlocks.push({ label, content: innerContent });
            extractedContent = extractedContent.replace(match[0], '');
        }

        const rawHtml = marked.parse(extractedContent.trim()) as string;
        const sanitized = DOMPurify.sanitize(rawHtml, { 
            ADD_TAGS: ['style', 'details', 'summary'],
            ADD_ATTR: ['style', 'class', 'open']
        });
        
        return { mainHtml: sanitized, thinkingBlocks: foundThinkingBlocks };
    }, [isUser, message.content, activePersona, isStreaming, isArenaActive]); 
    
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            textarea.focus();
        }
    }, [isEditing, editingContent]);

    const handlePlayTTS = async () => {
        if (!message.content) return;
        
        try {
            const voice = ttsProvider === 'native' ? ttsNativeVoice : ttsVoice;
            playImmediately(message.content, voice, message.id, {
                provider: ttsProvider,
                rate: ttsRate,
                pitch: ttsPitch
            });
        } catch (e) {
            showToast(`TTS Error: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    };

    if (isEditing) {
        return (
            <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                 {!isUser && !isSystem && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0" />
                 )}
                <div className={`rounded-lg px-4 py-3 max-w-lg w-full ${isUser ? 'bg-sky-600' : 'bg-slate-700'}`}>
                    <textarea
                        ref={textareaRef}
                        value={editingContent}
                        onChange={(e) => onContentChange(e.target.value)}
                        className="w-full bg-transparent text-white focus:outline-none resize-none overflow-hidden"
                        rows={1}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                        <button onClick={onCancel} className="px-3 py-1 text-xs font-semibold rounded-md bg-slate-600 hover:bg-slate-500 text-white transition-colors">Hủy</button>
                        <button onClick={onSave} className="px-3 py-1 text-xs font-semibold rounded-md bg-sky-500 hover:bg-sky-400 text-white transition-colors">Lưu</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSystem) {
        return (
             <div className="flex justify-center my-4 group">
                <div className="bg-slate-800/70 border border-slate-600/50 text-slate-400 text-sm px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
                    <span className="italic">{message.content}</span>
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageMenu actions={menuActions} isUser={false} />
                    </div>
                </div>
            </div>
        );
    }

    // --- ARENA MODE RENDER ---
    if (isArenaActive) {
        return (
            <ArenaBubble 
                message={message} 
                onSelect={(sel) => onArenaSelect && onArenaSelect(message.id, sel)}
                onRetry={(sel) => onArenaRetry && onArenaRetry(message.id, sel)}
            />
        );
    }

    // --- STANDARD RENDER ---
    return (
        <div className={`flex items-end gap-2 my-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
             <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <MessageMenu actions={menuActions} isUser={isUser} />
            </div>
            {!isUser && (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden self-start shadow-md border border-slate-600/30">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        </div>
                    )}
                </div>
            )}
            <div className={`rounded-lg px-4 py-2 max-w-lg shadow-sm relative ${isUser ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-700/90 backdrop-blur-md text-slate-200 rounded-bl-none'}`}>
                {/* TTS Button */}
                {!isUser && ttsEnabled && !isStreaming && (
                    <div className="absolute -top-3 -right-2 flex items-center gap-1">
                        
                        <button 
                            onClick={handlePlayTTS} 
                            disabled={isPlayingThis}
                            className={`p-1.5 rounded-full shadow-sm border transition-colors ${
                                isPlayingThis ? 'bg-sky-500 text-white border-sky-400 animate-bounce' : 
                                'bg-slate-800 text-slate-400 border-slate-600 hover:text-sky-400 hover:border-sky-500'
                            }`}
                            title={isPlayingThis ? "Đang đọc..." : "Đọc tin nhắn (TTS)"}
                            aria-label={isPlayingThis ? "Đang đọc tin nhắn" : "Đọc tin nhắn này"}
                        >
                            {isPlayingThis ? (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            )}
                        </button>
                    </div>
                )}

                {isUser ? (
                     <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                    <>
                        {/* 
                            RAW STREAMING MODE: 
                            If streaming, show RAW text (Method A: show <thinking> etc). 
                            No markdown parsing, no html cleaning, no React rendering overhead.
                        */}
                        {isStreaming ? (
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                {message.content}
                            </div>
                        ) : (
                            <>
                                {thinkingBlocks.map((block, idx) => (
                                    <ThinkingReveal key={idx} content={block.content} label={block.label} />
                                ))}
                                <div
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: mainHtml }}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const compareMenuActions = (prev: MessageMenuAction[], next: MessageMenuAction[]) => {
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
        if (prev[i].label !== next[i].label || prev[i].disabled !== next[i].disabled) {
            return false;
        }
    }
    return true;
};

export const MessageBubble = memo(MessageBubbleComponent, (prev, next) => {
    return (
        prev.message.content === next.message.content &&
        prev.message.role === next.message.role &&
        prev.message.id === next.message.id &&
        prev.isEditing === next.isEditing &&
        prev.editingContent === next.editingContent &&
        prev.avatarUrl === next.avatarUrl &&
        prev.isImmersive === next.isImmersive &&
        prev.isStreaming === next.isStreaming && // Important: Re-render if streaming state changes
        // NEW: Check Arena State changes
        prev.message.arena?.modelA.content === next.message.arena?.modelA.content &&
        prev.message.arena?.modelB.content === next.message.arena?.modelB.content &&
        prev.message.arena?.modelA.completed === next.message.arena?.modelA.completed && // Check completion A
        prev.message.arena?.modelB.completed === next.message.arena?.modelB.completed && // Check completion B
        prev.message.arena?.selected === next.message.arena?.selected &&
        
        compareMenuActions(prev.menuActions, next.menuActions)
    );
});
