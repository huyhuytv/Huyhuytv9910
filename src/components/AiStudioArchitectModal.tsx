
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { CharacterCard, WorldInfoEntry } from '../types';
import { Tooltip } from './Tooltip';
import { GoogleGenAI } from "@google/genai";
import { getApiKey, getActiveModel, getProxyForTools, getProxyUrl, getProxyPassword, getProxyLegacyMode } from '../services/settingsService';
import { CONTEXT_FILES, DEFAULT_ARCHITECT_PROMPT } from '../services/architectContext';
import { Loader } from './Loader';

interface AiStudioArchitectModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: CharacterCard;
    onSaveCard: (newCard: CharacterCard) => void;
}

type Tab = 'chat' | 'config' | 'context';

interface ChatMessage {
    id: string;
    role: 'user' | 'ai' | 'system';
    content: string;
    timestamp: number;
}

export const AiStudioArchitectModal: React.FC<AiStudioArchitectModalProps> = ({ isOpen, onClose, card, onSaveCard }) => {
    const [activeTab, setActiveTab] = useState<Tab>('context'); // Start at context to encourage selection
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    
    // Config State
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_ARCHITECT_PROMPT);
    
    // Context State
    const [selectedLorebookUids, setSelectedLorebookUids] = useState<Set<string>>(new Set());

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial Welcome Message
    useEffect(() => {
        if (isOpen && chatHistory.length === 0) {
            setChatHistory([{
                id: 'welcome',
                role: 'ai',
                content: `Chào mừng bạn đến với **AI Studio Architect**!\n\nTôi là chuyên gia kỹ thuật giúp bạn tối ưu hóa thẻ nhân vật "${card.name}".\n\n**Bước 1:** Hãy qua tab **"Ngữ cảnh (Context)"** để chọn các mục Sổ tay quan trọng (ví dụ: định nghĩa biến, quy tắc logic).\n**Bước 2:** Quay lại đây và cho tôi biết bạn muốn sửa đổi hoặc nâng cấp điều gì.\n\nTôi đã sẵn sàng!`,
                timestamp: Date.now()
            }]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'chat' && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, activeTab]);

    // --- LOGIC FUNCTIONS ---

    const toggleLorebookEntry = (uid: string) => {
        setSelectedLorebookUids(prev => {
            const newSet = new Set(prev);
            if (newSet.has(uid)) newSet.delete(uid);
            else newSet.add(uid);
            return newSet;
        });
    };

    const buildFullPrompt = (userInstruction: string): string => {
        const appSourceCode = Object.entries(CONTEXT_FILES)
            .map(([name, content]) => `// --- FILE: ${name}.ts ---\n${content}`)
            .join('\n\n');

        const scriptTavern = JSON.stringify(card.extensions?.TavernHelper_scripts || [], null, 2);
        const scriptRegex = JSON.stringify(card.extensions?.regex_scripts || [], null, 2);
        
        const selectedEntries = (card.char_book?.entries || [])
            .filter(e => e.uid && selectedLorebookUids.has(e.uid));
        
        const lorebookJson = JSON.stringify(selectedEntries, null, 2);

        let finalPrompt = systemPrompt;
        finalPrompt = finalPrompt.replace('{{app_source_code}}', appSourceCode);
        finalPrompt = finalPrompt.replace('{{card_name}}', card.name);
        finalPrompt = finalPrompt.replace('{{card_script_tavern}}', scriptTavern);
        finalPrompt = finalPrompt.replace('{{card_script_regex}}', scriptRegex);
        finalPrompt = finalPrompt.replace('{{card_first_mes}}', card.first_mes);
        finalPrompt = finalPrompt.replace('{{card_lorebook_selected}}', lorebookJson);
        finalPrompt = finalPrompt.replace('{{user_instruction}}', userInstruction);

        return finalPrompt;
    };

    // Helper to generate response using Dual Driver (Direct vs Proxy)
    const generateResponse = async (fullPrompt: string): Promise<string> => {
        if (getProxyForTools()) {
            // PROXY MODE
            const proxyUrl = getProxyUrl();
            const proxyPassword = getProxyPassword();
            const isLegacyMode = getProxyLegacyMode();
            const model = getActiveModel(); 

            if (!proxyUrl) throw new Error("Proxy URL chưa được cấu hình.");

            const cleanUrl = proxyUrl.trim().replace(/\/$/, '');
            const endpoint = `${cleanUrl}/v1/chat/completions`;

            const payload = {
                model: model,
                messages: [{ role: 'user', content: fullPrompt }],
                stream: false
            };

            const headers: Record<string, string> = {};
            if (isLegacyMode) {
                headers['Content-Type'] = 'text/plain';
            } else {
                headers['Content-Type'] = 'application/json';
                if (proxyPassword) {
                    headers['Authorization'] = `Bearer ${proxyPassword}`;
                }
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Proxy Error: ${errorText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';

        } else {
            // DIRECT MODE
            const apiKey = getApiKey();
            if (!apiKey) throw new Error("Chưa cấu hình API Key trong phần Cài đặt.");

            const ai = new GoogleGenAI({ apiKey });
            const model = getActiveModel(); 
            
            const response = await ai.models.generateContent({
                model: model,
                contents: fullPrompt,
            });

            return response.text || "";
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isSending) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, userMsg]);
        setInput('');
        setIsSending(true);

        try {
            // Construct the prompt with all context injected
            const fullPrompt = buildFullPrompt(userMsg.content);
            
            const text = await generateResponse(fullPrompt);

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: text || "Xin lỗi, tôi không thể tạo phản hồi.",
                timestamp: Date.now()
            };
            setChatHistory(prev => [...prev, aiMsg]);

        } catch (e) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: `Lỗi: ${e instanceof Error ? e.message : String(e)}`,
                timestamp: Date.now()
            };
            setChatHistory(prev => [...prev, errorMsg]);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) return null;

    // --- RENDER HELPERS ---

    const renderChat = () => (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
                {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'ai' ? 'bg-indigo-600' : (msg.role === 'system' ? 'bg-red-900' : 'bg-slate-600')
                        }`}>
                            {msg.role === 'ai' ? '🏗️' : (msg.role === 'system' ? '⚠️' : '👤')}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                            msg.role === 'user' 
                                ? 'bg-sky-700 text-white rounded-tr-none' 
                                : (msg.role === 'system' ? 'bg-red-900/50 border border-red-500/50 text-red-200' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700')
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isSending && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">🏗️</div>
                        <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-700">
                            <Loader message="Architect đang phân tích mã..." />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập yêu cầu của bạn (Ví dụ: 'Hãy sửa lỗi hiển thị thanh máu trong script')..."
                        rows={3}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pr-12 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm shadow-inner"
                        disabled={isSending}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isSending}
                        className="absolute bottom-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Gửi tin nhắn"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderConfig = () => (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold text-sky-400 mb-4">Cấu hình Prompt Template</h3>
            <p className="text-sm text-slate-400 mb-4">
                Đây là lời nhắc hệ thống sẽ được gửi kèm với dữ liệu thẻ. Các biến giữ chỗ như <code>{`{{app_source_code}}`}</code> sẽ được tự động thay thế bằng nội dung thực tế.
            </p>
            <div className="bg-slate-900/50 p-3 rounded border border-slate-700 mb-4 text-xs text-slate-400 font-mono">
                Các biến khả dụng: <br/>
                - <code>{`{{app_source_code}}`}</code>: Mã nguồn hệ thống (Hardcoded).<br/>
                - <code>{`{{card_script_tavern}}`}</code>, <code>{`{{card_script_regex}}`}</code>: Script từ thẻ.<br/>
                - <code>{`{{card_lorebook_selected}}`}</code>: Các mục Lorebook đã chọn.<br/>
                - <code>{`{{user_instruction}}`}</code>: Câu hỏi của bạn.
            </div>
            <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={20}
                className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={() => setSystemPrompt(DEFAULT_ARCHITECT_PROMPT)}
                    className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                    Khôi phục mặc định
                </button>
            </div>
        </div>
    );

    const renderContext = () => (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col">
            <h3 className="text-lg font-bold text-sky-400 mb-2">Chọn Ngữ cảnh Sổ tay (Lorebook)</h3>
            <p className="text-sm text-slate-400 mb-6">
                Chọn các mục Sổ tay quan trọng để gửi kèm cho AI. (Ví dụ: Các mục chứa định nghĩa biến số [InitVar], hoặc Logic game).
                Không nên chọn tất cả để tiết kiệm token.
            </p>
            
            <div className="flex-grow space-y-2">
                {(!card.char_book?.entries || card.char_book.entries.length === 0) ? (
                    <div className="text-center text-slate-500 italic py-10 border border-dashed border-slate-700 rounded-lg">
                        Không có mục Sổ tay nào trong thẻ này.
                    </div>
                ) : (
                    card.char_book.entries.map((entry, idx) => {
                        const uid = entry.uid || `temp_idx_${idx}`;
                        // Ensure UID exists for selection logic even if missing in data
                        if (!entry.uid) entry.uid = uid; 
                        
                        const isSelected = selectedLorebookUids.has(uid);
                        
                        return (
                            <div 
                                key={uid}
                                onClick={() => toggleLorebookEntry(uid)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                    isSelected 
                                    ? 'bg-indigo-900/30 border-indigo-500/50 shadow-sm' 
                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-slate-500'
                                }`}>
                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start">
                                        <span className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-200' : 'text-slate-300'}`}>
                                            {entry.comment || `Mục #${idx + 1}`}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono ml-2 shrink-0">
                                            {entry.keys.slice(0, 2).join(', ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-mono">
                                        {entry.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                <span className="text-sm text-slate-400">Đã chọn: <strong className="text-white">{selectedLorebookUids.size}</strong> mục</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSelectedLorebookUids(new Set())}
                        className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                    >
                        Bỏ chọn tất cả
                    </button>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className="px-4 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-bold"
                    >
                        Xong, Vào Chat
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6">
            <div className="w-full h-full md:max-w-6xl md:h-[90vh] bg-slate-900 border border-slate-700 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <header className="h-16 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                            <span className="text-xl">🏗️</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white leading-tight">AI Studio Architect</h1>
                            <p className="text-xs text-indigo-300 font-medium">Chuyên gia tối ưu hóa thẻ nhân vật</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        aria-label="Đóng Architect"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="flex flex-grow overflow-hidden">
                    {/* Sidebar / Tabs */}
                    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 hidden md:flex">
                        <nav className="p-4 space-y-2">
                            <button 
                                onClick={() => setActiveTab('context')}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'context' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                            >
                                <span>📚</span> <span className="font-bold text-sm">1. Chọn Ngữ cảnh</span>
                                {selectedLorebookUids.size > 0 && <span className="ml-auto bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{selectedLorebookUids.size}</span>}
                            </button>
                            <button 
                                onClick={() => setActiveTab('config')}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'config' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                            >
                                <span>⚙️</span> <span className="font-bold text-sm">2. Cấu hình Prompt</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('chat')}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'chat' ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50 text-white shadow-md border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                            >
                                <span>💬</span> <span className="font-bold text-sm">3. Trò chuyện</span>
                            </button>
                        </nav>
                        
                        <div className="mt-auto p-4 border-t border-slate-800">
                            <div className="text-xs text-slate-500 text-center">
                                Architect v1.0 <br/> Powered by Gemini
                            </div>
                        </div>
                    </div>

                    {/* Mobile Tabs */}
                    <div className="md:hidden w-full bg-slate-900 border-b border-slate-800 flex overflow-x-auto shrink-0">
                         <button onClick={() => setActiveTab('context')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'context' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Ngữ cảnh</button>
                         <button onClick={() => setActiveTab('config')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'config' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Cấu hình</button>
                         <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'chat' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Chat</button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-grow bg-slate-900/50 relative overflow-hidden">
                        {activeTab === 'context' && renderContext()}
                        {activeTab === 'config' && renderConfig()}
                        {activeTab === 'chat' && renderChat()}
                    </div>
                </div>
            </div>
        </div>
    );
};
