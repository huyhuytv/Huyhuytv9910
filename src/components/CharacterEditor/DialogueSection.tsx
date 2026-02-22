
import React, { useState, useId, useMemo } from 'react';
import type { CharacterCard } from '../../types';
import { Section } from '../ui/Section';
import { LabeledTextarea } from '../ui/LabeledTextarea';
import { CopyButton } from '../ui/CopyButton';
import { Loader } from '../Loader';
import { translateGreetingsBatch } from '../../services/translationService'; // UPDATED IMPORT
import { getActiveModel } from '../../services/settingsService';
import { useToast } from '../ToastSystem';

interface DialogueSectionProps {
    card: CharacterCard;
    onUpdate: (card: CharacterCard) => void;
    onChange: (field: keyof CharacterCard, value: any) => void;
}

export const DialogueSection: React.FC<DialogueSectionProps> = ({ card, onUpdate, onChange }) => {
    const allGreetings = useMemo(() => [card.first_mes, ...(card.alternate_greetings || [])], [card.first_mes, card.alternate_greetings]);
    const firstGreetingId = useId();
    const [isTranslating, setIsTranslating] = useState(false);
    const { showToast } = useToast();

    // --- Greetings Logic ---
    const handleGreetingChange = (index: number, value: string) => {
        const newGreetings = [...allGreetings];
        newGreetings[index] = value;
        const [newFirstMes, ...newAlternates] = newGreetings;
        onUpdate({ ...card, first_mes: newFirstMes, alternate_greetings: newAlternates.length > 0 ? newAlternates : [] });
    };

    const addGreeting = () => {
        const newGreetings = [...allGreetings, ''];
        const [newFirstMes, ...newAlternates] = newGreetings;
        onUpdate({ ...card, first_mes: newFirstMes, alternate_greetings: newAlternates });
    };

    const removeGreeting = (index: number) => {
        if (allGreetings.length <= 1) return;
        const newGreetings = allGreetings.filter((_, i) => i !== index);
        const [newFirstMes, ...newAlternates] = newGreetings;
        onUpdate({ ...card, first_mes: newFirstMes, alternate_greetings: newAlternates.length > 0 ? newAlternates : [] });
    };

    const setAsPrimary = (index: number) => {
        if (index === 0) return;
        const newGreetings = [...allGreetings];
        const itemToMove = newGreetings.splice(index, 1)[0];
        newGreetings.unshift(itemToMove);
        const [newFirstMes, ...newAlternates] = newGreetings;
        onUpdate({ ...card, first_mes: newFirstMes, alternate_greetings: newAlternates });
    };

    // --- Group Greetings Logic ---
    const groupGreetings = card.group_only_greetings || [];
    const handleGroupChange = (index: number, value: string) => {
        const newG = [...groupGreetings];
        newG[index] = value;
        onUpdate({ ...card, group_only_greetings: newG });
    };
    const addGroupGreeting = () => onUpdate({ ...card, group_only_greetings: [...groupGreetings, ''] });
    const removeGroupGreeting = (index: number) => onUpdate({ ...card, group_only_greetings: groupGreetings.filter((_, i) => i !== index) });

    // --- AI Translation ---
    const handleTranslate = async () => {
        setIsTranslating(true);
        try {
            const payload = {
                first_mes: card.first_mes,
                alternate_greetings: card.alternate_greetings || [],
                group_only_greetings: card.group_only_greetings || []
            };
            const context = { name: card.name, description: card.description };
            const model = getActiveModel();
            const translatedData = await translateGreetingsBatch(payload, context, model);

            onUpdate({
                ...card,
                first_mes: translatedData.first_mes,
                alternate_greetings: translatedData.alternate_greetings,
                group_only_greetings: translatedData.group_only_greetings
            });
            showToast("Đã dịch xong toàn bộ lời chào!", "success");
        } catch (error) {
            console.error(error);
            showToast(`Lỗi dịch thuật: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <Section title="Đối thoại" description="Lời chào đầu tiên và các ví dụ hội thoại.">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isTranslating ? <Loader message="Đang dịch..." /> : <><span>✨</span> Dịch toàn bộ Lời chào (AI)</>}
                </button>
            </div>

            {/* Standard Greetings */}
            <div className="space-y-4">
                {allGreetings.map((greeting, index) => (
                    <div key={index} className={`bg-slate-700/50 p-4 rounded-lg ${isTranslating ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor={`${firstGreetingId}-${index}`} className="text-sm font-bold text-slate-300">
                                {index === 0 ? 'Lời chào Chính (first_mes)' : `Lời chào Thay thế #${index}`}
                            </label>
                            <div className="flex items-center gap-2">
                                {index > 0 && (
                                    <button onClick={() => setAsPrimary(index)} className="text-xs bg-sky-700 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-md transition-colors">
                                        Đặt làm Chính
                                    </button>
                                )}
                                {allGreetings.length > 1 && (
                                    <button 
                                        onClick={() => removeGreeting(index)} 
                                        className="text-slate-400 hover:text-red-400"
                                        aria-label={`Xóa lời chào số ${index}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="relative">
                            <textarea
                                id={`${firstGreetingId}-${index}`}
                                value={greeting}
                                onChange={(e) => handleGreetingChange(index, e.target.value)}
                                rows={8}
                                disabled={isTranslating}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-800 disabled:text-slate-500"
                            />
                            <CopyButton textToCopy={greeting} absolute={true} />
                        </div>
                    </div>
                ))}
                <button onClick={addGreeting} disabled={isTranslating} className="w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-600 disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    Thêm Lời chào
                </button>
            </div>

            <div className="border-t border-slate-700 my-4"></div>

            {/* Group Greetings */}
            <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-300">Lời chào Chỉ dành cho Nhóm</h4>
                {groupGreetings.map((greeting, index) => (
                    <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-slate-300">Lời chào Nhóm #{index + 1}</label>
                            <button 
                                onClick={() => removeGroupGreeting(index)} 
                                className="text-slate-400 hover:text-red-400"
                                aria-label={`Xóa lời chào nhóm số ${index + 1}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={greeting}
                                onChange={(e) => handleGroupChange(index, e.target.value)}
                                rows={4}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                            />
                            <CopyButton textToCopy={greeting} absolute={true} />
                        </div>
                    </div>
                ))}
                <button onClick={addGroupGreeting} className="w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    Thêm Lời chào Nhóm
                </button>
            </div>

            <div className="border-t border-slate-700 my-4"></div>
            
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Ví dụ hội thoại (Phân tách bằng <START>)" 
                value={card.mes_example} 
                onChange={(e) => onChange('mes_example', e.target.value)} 
                rows={8} 
            />
        </Section>
    );
};
