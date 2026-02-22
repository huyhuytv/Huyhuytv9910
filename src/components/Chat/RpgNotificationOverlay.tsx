import React from 'react';
import { useChatStore } from '../../store/chatStore';

export const RpgNotificationOverlay: React.FC = () => {
    const notification = useChatStore(state => state.rpgNotification);
    const setNotification = useChatStore(state => state.setRpgNotification);

    if (!notification) return null;

    // Split notification by newlines to render as list if needed
    const lines = notification.split('\n').filter(line => line.trim() !== '');

    return (
        <div className="fixed bottom-24 right-4 z-[60] animate-slide-in-right max-w-xs md:max-w-sm pointer-events-none">
            <div className="bg-slate-900/95 backdrop-blur-md border-l-4 border-amber-500 shadow-2xl rounded-r-lg p-4 pointer-events-auto relative overflow-hidden group">
                
                {/* Close Button (Hidden by default, shown on hover) */}
                <button 
                    onClick={() => setNotification(null)}
                    className="absolute top-1 right-1 text-slate-500 hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Đóng thông báo này"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>

                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-full shrink-0">
                        <span className="text-xl" role="img" aria-label="rpg-icon">⚔️</span>
                    </div>
                    <div className="flex-grow">
                        <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                            Mythic Engine Update
                        </h4>
                        <div className="text-sm text-slate-200 space-y-1 font-medium max-h-40 overflow-y-auto custom-scrollbar">
                            {lines.map((line, idx) => (
                                <p key={idx} className="leading-snug border-b border-slate-800/50 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};