
import React, { useState, useRef, useCallback } from 'react';
import type { CharacterInContext, SillyTavernPreset, ChatSession } from '../types';
import { useUserPersona } from '../contexts/UserPersonaContext';
import * as dbService from '../services/dbService';
import { Loader } from './Loader';
import { parseEpubFile } from '../services/epubParser';

interface StoryImporterModalProps {
    character: CharacterInContext;
    preset: SillyTavernPreset;
    onClose: () => void;
    onStart: (sessionId: string) => void;
}

export const StoryImporterModal: React.FC<StoryImporterModalProps> = ({ character, preset, onClose, onStart }) => {
    const [chunkSize, setChunkSize] = useState(2000);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>(''); // Store text content
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewChunks, setPreviewChunks] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { activePersonaId } = useUserPersona();

    /**
     * Logic cắt đoạn thông minh (Smart Split)
     * - Cố gắng giữ trọn vẹn câu văn.
     * - Cắt dựa trên dấu chấm câu (. ! ? \n) gần nhất khi đạt giới hạn từ.
     */
    const smartSplit = useCallback((text: string, targetWordCount: number): string[] => {
        // 1. Tách văn bản thành các câu hoặc đoạn nhỏ dựa trên dấu câu kết thúc
        // Regex này tìm chuỗi không phải dấu kết thúc, theo sau bởi dấu kết thúc (hoặc xuống dòng)
        const sentenceRegex = /[^.!?\n]+([.!?\n]+|$)/g;
        const sentences = text.match(sentenceRegex) || [text];

        const chunks: string[] = [];
        let currentChunk = "";
        let currentWordCount = 0;

        for (const sentence of sentences) {
            const sentenceWordCount = sentence.trim().split(/\s+/).length;

            // Nếu cộng thêm câu này mà vượt quá giới hạn (cho phép lố 1 chút ~10% để hết câu)
            // VÀ chunk hiện tại không rỗng -> Ngắt chunk cũ, bắt đầu chunk mới
            if (currentWordCount + sentenceWordCount > targetWordCount && currentWordCount > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
                currentWordCount = sentenceWordCount;
            } else {
                // Cộng dồn vào chunk hiện tại
                currentChunk += sentence;
                currentWordCount += sentenceWordCount;
            }
        }

        // Đẩy chunk cuối cùng nếu còn
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }, []);

    const updatePreview = (text: string, size: number) => {
        if (!text) return;
        const totalWords = text.trim().split(/\s+/).length;
        const chunks = smartSplit(text, size);
        
        setPreviewChunks([
            `Tổng số từ: ~${totalWords.toLocaleString()}`,
            `Số đoạn ước tính: ${chunks.length}`,
            `Độ dài trung bình: ~${Math.round(totalWords / chunks.length)} từ/đoạn`,
            `--- Xem trước đoạn 1 (Trích đoạn) ---`,
            chunks[0].substring(0, 150) + "..."
        ]);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError('');
            setIsProcessing(true); // Show loading while parsing
            
            try {
                let text = "";
                if (selectedFile.name.toLowerCase().endsWith('.epub')) {
                    text = await parseEpubFile(selectedFile);
                } else {
                    text = await selectedFile.text();
                }

                if (!text.trim()) {
                    throw new Error("File trống hoặc không trích xuất được văn bản.");
                }

                setFileContent(text);
                updatePreview(text, chunkSize);
            } catch (e) {
                setError(`Không thể đọc file: ${e instanceof Error ? e.message : String(e)}`);
                setFile(null);
                setFileContent('');
                setPreviewChunks([]);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleChunkSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseInt(e.target.value);
        setChunkSize(newSize);
        if (fileContent) {
            updatePreview(fileContent, newSize);
        }
    };

    const handleStart = async () => {
        if (!file || !fileContent) return;
        setIsProcessing(true);
        setError('');

        try {
            // Sử dụng logic smartSplit để tạo dữ liệu thật
            const chunks = smartSplit(fileContent, chunkSize);
            
            const newSessionId = character.fileName;
            
            // Check existence
            try {
                const existing = await dbService.getChatSession(newSessionId);
                if (existing) {
                    if (!confirm(`Phiên trò chuyện với ${character.card.name} đã tồn tại. Bạn có muốn ghi đè không?`)) {
                        setIsProcessing(false);
                        return;
                    }
                    await dbService.deleteChatSession(newSessionId);
                }
            } catch {}

            const newSession: ChatSession = {
                sessionId: newSessionId,
                characterFileName: character.fileName,
                presetName: preset.name,
                userPersonaId: activePersonaId,
                chatHistory: [], // Empty history
                storyQueue: chunks, // The entire story waiting to be told
                longTermSummaries: [],
                variables: {}, 
                worldInfoRuntime: {}, 
                lastMessageSnippet: "Chế độ Cốt Truyện: " + file.name,
                lastUpdated: Date.now(),
            };

            await dbService.saveChatSession(newSession);
            onStart(newSessionId);

        } catch (e) {
            setError("Lỗi xử lý file: " + e);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
                <h2 className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
                    <span>📖</span> Nhập Tiền Truyện (Story Mode)
                </h2>
                
                <div className="space-y-6">
                    {/* File Upload */}
                    <div 
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className={`border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50 hover:border-sky-500/50 transition-colors ${file ? 'border-sky-500 bg-slate-700/30' : ''}`}
                    >
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept=".txt,.epub" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                        {isProcessing && !fileContent ? (
                             <Loader message="Đang đọc file..." />
                        ) : file ? (
                            <div className="text-sky-300 font-bold break-all">{file.name}</div>
                        ) : (
                            <>
                                <span className="text-3xl mb-2">📄</span>
                                <span className="text-sm text-slate-400">Nhấn để chọn file truyện (.txt, .epub)</span>
                            </>
                        )}
                    </div>

                    {error && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded">{error}</p>}

                    {/* Settings */}
                    <div className={!fileContent ? 'opacity-50 pointer-events-none' : ''}>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Độ dài mỗi đoạn (Số từ mục tiêu)
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="500" 
                                max="5000" 
                                step="100" 
                                value={chunkSize} 
                                onChange={handleChunkSizeChange}
                                className="flex-grow h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <span className="text-sky-400 font-mono font-bold w-16 text-right">{chunkSize}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic">
                            Hệ thống sẽ tự động tìm dấu câu gần nhất để ngắt đoạn, đảm bảo câu văn trọn vẹn (Smart Chunking).
                        </p>
                    </div>

                    {/* Preview Info */}
                    {previewChunks.length > 0 && (
                        <div className="bg-slate-900/50 p-3 rounded border border-slate-700 text-xs font-mono text-slate-300 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {previewChunks.map((line, idx) => <div key={idx} className="break-words">{line}</div>)}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold text-sm transition-colors"
                            disabled={isProcessing}
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={handleStart}
                            disabled={!file || !fileContent || isProcessing}
                            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-sky-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing && fileContent ? <Loader message="" /> : "Vào Game"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
