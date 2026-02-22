
import React, { useState, useEffect, useRef } from 'react';
// @FIX: Corrected import path for types.
import type { VisualState } from '../types';

interface ChatHeaderProps {
    characterName: string;
    onBack: () => void;
    isImmersive: boolean;
    setIsImmersive: (value: boolean) => void;
    visualState: VisualState;
    onVisualUpdate: (type: 'bg' | 'music' | 'sound' | 'class', value: string) => void;
}

const VisualSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    visualState: VisualState;
    onUpdate: (type: 'bg' | 'music' | 'sound' | 'class', value: string) => void;
}> = ({ isOpen, onClose, visualState, onUpdate }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onClose();
                } else if (event.key === 'Tab' && modalRef.current) {
                    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
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
            setTimeout(() => closeButtonRef.current?.focus(), 100);

            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    return (
        <div ref={modalRef} className="absolute top-14 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 animate-fade-in-up p-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <h3 className="font-bold text-slate-200">Cài đặt Giao diện & Âm thanh</h3>
                <button ref={closeButtonRef} onClick={onClose} className="text-slate-400 hover:text-white">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Link Hình nền (URL)</label>
                    <input 
                        type="text" 
                        value={visualState.backgroundImage || ''} 
                        onChange={(e) => onUpdate('bg', e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200"
                    />
                    <button onClick={() => onUpdate('bg', 'off')} className="text-xs text-red-400 mt-1 hover:underline">Xóa nền</button>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Link Nhạc nền (URL)</label>
                    <input 
                        type="text" 
                        value={visualState.musicUrl || ''} 
                        onChange={(e) => onUpdate('music', e.target.value)}
                        placeholder="https://... (mp3/ogg)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200"
                    />
                    <button onClick={() => onUpdate('music', 'off')} className="text-xs text-red-400 mt-1 hover:underline">Tắt nhạc</button>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Hiệu ứng CSS Global</label>
                    <input 
                        type="text" 
                        value={visualState.globalClass || ''} 
                        onChange={(e) => onUpdate('class', e.target.value)}
                        placeholder="grayscale, blur-sm, sepia..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200"
                    />
                </div>
            </div>
        </div>
    )
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({ characterName, onBack, isImmersive, setIsImmersive, visualState, onVisualUpdate }) => {
    const [isVisualMenuOpen, setIsVisualMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleCloseMenu = () => {
        setIsVisualMenuOpen(false);
        triggerRef.current?.focus();
    }

    const headerClasses = isImmersive
        ? "p-3 bg-slate-900/60 backdrop-blur-md border-b border-white/10 flex items-center gap-4 relative z-10 transition-all duration-300 hover:bg-slate-900/80"
        : "p-3 border-b border-slate-700 flex items-center gap-4 relative z-10 bg-slate-800/80 backdrop-blur-md";

    return (
        <div className={headerClasses}>
            <button onClick={isImmersive ? () => setIsImmersive(false) : onBack} className="text-slate-400 hover:text-sky-400 transition-colors" title={isImmersive ? "Thoát chế độ nhà hát" : "Quay lại"}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    {isImmersive 
                     ? <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 011 1v1.586l2.293-2.293a1 1 0 011.414 1.414L5.414 15H7a1 1 0 010 2H3a1 1 0 01-1-1v-4a1 1 0 011-1zm13.707-1.293a1 1 0 00-1.414-1.414L13.586 15H12a1 1 0 000 2h4a1 1 0 001-1v-4z" clipRule="evenodd" />
                     : <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    }
                </svg>
            </button>
            <div className="flex-grow">
                <h2 className="text-lg font-bold text-slate-200 truncate">Trò chuyện với {characterName}</h2>
                {isImmersive && <p className="text-xs text-slate-400 hidden sm:block">{visualState.musicUrl ? '♫ Đang phát nhạc' : 'Chế độ Nhà hát'}</p>}
            </div>

            {/* Visual Settings Toggle */}
            <div className="relative">
                <button 
                    ref={triggerRef}
                    onClick={() => setIsVisualMenuOpen(!isVisualMenuOpen)}
                    className={`p-2 rounded-full transition-colors ${isVisualMenuOpen ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    title="Cài đặt Giao diện & Âm thanh"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                </button>
                <VisualSettingsModal 
                    isOpen={isVisualMenuOpen} 
                    onClose={handleCloseMenu}
                    visualState={visualState}
                    onUpdate={onVisualUpdate}
                />
            </div>

            {/* Immersive Toggle */}
            <button 
                onClick={() => setIsImmersive(!isImmersive)}
                className={`p-2 rounded-full transition-colors ${isImmersive ? 'text-sky-400 hover:text-sky-300' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title={isImmersive ? "Thoát Chế độ Nhà hát" : "Chế độ Nhà hát (Immersive Mode)"}
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 011 1v1.586l2.293-2.293a1 1 0 011.414 1.414L5.414 15H7a1 1 0 010 2H3a1 1 0 01-1-1v-4a1 1 0 011-1zm13.707-1.293a1 1 0 00-1.414-1.414L13.586 15H12a1 1 0 000 2h4a1 1 0 001-1v-4z" clipRule="evenodd" /></svg>
            </button>
        </div>
    );
};
