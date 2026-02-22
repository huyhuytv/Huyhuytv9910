
import React from 'react';
import type { CharacterCard, Lorebook } from '../../types';
import { Section } from '../ui/Section';

interface LorebookSectionProps {
    card: CharacterCard;
    availableLorebooks: Lorebook[];
    onOpenLorebook: () => void;
    onImport: (bookName: string) => void;
}

export const LorebookSection: React.FC<LorebookSectionProps> = ({ card, availableLorebooks, onOpenLorebook, onImport }) => {
    const entries = card.char_book?.entries || [];
    const enabledEntries = entries.filter(e => e.enabled !== false).length;
    const attachedLorebooks = card.attached_lorebooks || [];

    return (
        <Section title="Sổ tay & Thế giới (Lorebook)" description="Quản lý kiến thức nền, định nghĩa thế giới và các liên kết mở rộng.">
            <div className="col-span-full space-y-4">
                {/* Stats & Main Action */}
                <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left space-y-1">
                        <h4 className="text-lg font-bold text-slate-200">Trạng thái Sổ tay</h4>
                        <p className="text-sm text-slate-400">
                            Nội bộ: <span className="font-mono text-sky-400 font-bold">{entries.length}</span> mục 
                            (<span className="text-green-400">{enabledEntries}</span> Bật)
                        </p>
                        {attachedLorebooks.length > 0 && (
                            <p className="text-sm text-slate-400">
                                Đang liên kết: <span className="font-mono text-amber-400 font-bold">{attachedLorebooks.length}</span> sổ tay ngoài
                            </p>
                        )}
                    </div>
                    <button 
                        onClick={onOpenLorebook}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                        Mở Trình quản lý (Full Screen)
                    </button>
                </div>

                {/* Attached Lorebooks Summary Chips */}
                {attachedLorebooks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center h-6">Liên kết:</span>
                        {attachedLorebooks.map((name, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-700/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                {name}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
};
