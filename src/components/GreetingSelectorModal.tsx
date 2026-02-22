
import React, { useState, useMemo, useEffect, useRef } from 'react';
// Fix: Import CharacterInContext from its definition file.
import type { SillyTavernPreset, CharacterInContext } from '../types';
import { truncateText } from '../utils';

interface GreetingSelectorModalProps {
    character: CharacterInContext;
    preset: SillyTavernPreset;
    onClose: () => void;
    onStart: (selectedGreeting: string) => void;
}

export const GreetingSelectorModal: React.FC<GreetingSelectorModalProps> = ({ character, preset, onClose, onStart }) => {
    const allGreetings = useMemo(() => {
        return [character.card.first_mes, ...(character.card.alternate_greetings || [])];
    }, [character.card]);

    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        triggerElementRef.current = document.activeElement as HTMLElement;
        setTimeout(() => closeButtonRef.current?.focus(), 100);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        event.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        event.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            triggerElementRef.current?.focus();
        };
    }, [onClose]);

    const handleToggleExpand = (index: number) => {
        setExpandedIndex(prev => prev === index ? null : index);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                ref={modalRef}
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-sky-400">Bắt đầu trò chuyện với {character.card.name}</h2>
                        <p className="text-sm text-slate-400">Chọn một lời chào để bắt đầu cuộc phiêu lưu của bạn.</p>
                    </div>
                    <button ref={closeButtonRef} onClick={onClose} className="p-1 text-slate-400 hover:text-white" aria-label="Đóng">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <main className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {allGreetings.map((greeting, index) => {
                        const isExpanded = expandedIndex === index;
                        const snippet = truncateText(greeting, 150);
                        const canExpand = greeting.length > 150;
                        
                        return (
                            <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
                                <h3 className="font-semibold text-slate-300 mb-2">
                                    {index === 0 ? 'Lời chào chính' : `Lời chào thay thế #${index}`}
                                </h3>
                                <p className="text-slate-400 text-sm whitespace-pre-wrap">
                                    {isExpanded ? greeting : snippet}
                                </p>
                                <div className="mt-3 flex justify-between items-center">
                                    {canExpand && (
                                        <button onClick={() => handleToggleExpand(index)} className="text-xs text-sky-400 hover:text-sky-300">
                                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                        </button>
                                    )}
                                    <div className="flex-grow"></div>
                                    <button 
                                        onClick={() => onStart(greeting)}
                                        className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 bg-sky-600 text-white hover:bg-sky-700"
                                    >
                                        Bắt đầu với lời chào này
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </main>
            </div>
        </div>
    );
};
