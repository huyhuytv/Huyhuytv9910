
import React, { useState } from 'react';
import type { CharacterCard, RPGDatabase } from '../../types';
import { Section } from '../ui/Section';
import { ToggleInput } from '../ui/ToggleInput';
import { RpgSchemaEditorModal } from '../RpgSchemaEditorModal';
import { RpgSettingsModal } from '../RpgSettingsModal';
import { getTemplateVH } from '../../data/rpgTemplates';

interface RpgSectionProps {
    card: CharacterCard;
    onUpdate: (card: CharacterCard) => void;
}

export const RpgSection: React.FC<RpgSectionProps> = ({ card, onUpdate }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const rpgData = card.rpg_data;
    const hasData = !!rpgData;

    const tableCount = rpgData?.tables?.length || 0;
    const liveLinkCount = rpgData?.tables?.filter(t => t.config.lorebookLink?.enabled).length || 0;
    
    // Status Bar Logic
    const executionMode = rpgData?.settings?.executionMode || 'standalone';
    const modeLabel = executionMode === 'integrated' ? '1-Pass' : '2-Pass';
    
    const statusText = hasData 
        ? `🟢 Mythic Engine: ${modeLabel} • ${tableCount} Bảng • ${liveLinkCount} Live-Link` 
        : "⚪ Mythic Engine: Off";

    const handleToggle = (enabled: boolean) => {
        if (enabled) {
            // Nếu bật và chưa có dữ liệu, nạp Template VH
            if (!rpgData) {
                const template = getTemplateVH();
                onUpdate({ ...card, rpg_data: template });
            }
        } else {
            // Removed confirmation dialog as requested
            const newCard = { ...card };
            delete newCard.rpg_data;
            onUpdate(newCard);
        }
    };

    const handleSaveDatabase = (newDb: RPGDatabase) => {
        onUpdate({ ...card, rpg_data: newDb });
    };

    return (
        <Section title="Hệ thống RPG (Mythic Engine)" description="Cấu hình cơ sở dữ liệu và luật chơi cho nhân vật này.">
            <div className="col-span-full space-y-4">
                <div className="flex items-center justify-between bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                    <div>
                        <h4 className="font-bold text-slate-200">Kích hoạt Mythic Engine</h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                            {statusText}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasData && (
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                                title="Cấu hình nâng cao"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                        <ToggleInput 
                            checked={hasData} 
                            onChange={handleToggle} 
                            label=""
                            clean 
                        />
                    </div>
                </div>

                {hasData && rpgData && (
                    <div className="animate-fade-in-up">
                        <button
                            onClick={() => setIsEditorOpen(true)}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex flex-col items-center justify-center gap-2 border border-indigo-400/30"
                        >
                            <span className="text-2xl">🛠️</span>
                            <span>Mở Trình Thiết Kế Cấu Trúc (Schema Builder)</span>
                            <span className="text-xs font-normal opacity-80 text-indigo-200">Chỉnh sửa bảng, cột và luật AI</span>
                        </button>
                        
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            {rpgData.tables?.map((t) => (
                                <div key={t.config.id} className="bg-slate-800 p-3 rounded border border-slate-700 text-sm text-slate-300 flex justify-between">
                                    <span>{t.config.name}</span>
                                    <span className="text-xs text-slate-500">{(t.config.columns || []).length} cột</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <RpgSchemaEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                database={rpgData}
                onSave={handleSaveDatabase}
            />

            {rpgData && (
                <RpgSettingsModal 
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    database={rpgData}
                    onSave={handleSaveDatabase}
                    lorebookEntries={card.char_book?.entries || []} // PASS ENTRIES HERE
                />
            )}
        </Section>
    );
};
