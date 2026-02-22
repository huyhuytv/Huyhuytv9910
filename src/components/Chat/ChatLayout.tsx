
import React from 'react';

interface ChatLayoutProps {
    children: React.ReactNode;
    isImmersive: boolean;
    globalClass?: string;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children, isImmersive, globalClass = '' }) => {
    const containerClasses = isImmersive 
        ? "fixed inset-0 z-50 bg-slate-900 flex flex-col" 
        : "bg-slate-800/50 rounded-xl shadow-lg flex flex-col flex-grow min-h-[70vh] relative overflow-hidden";

    return (
        <div className={`${containerClasses} ${globalClass}`}>
            {children}
            <style>{`
              .shake-animation {
                  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                  transform: translate3d(0, 0, 0);
                  backface-visibility: hidden;
                  perspective: 1000px;
              }
              @keyframes shake {
                  10%, 90% { transform: translate3d(-1px, 0, 0); }
                  20%, 80% { transform: translate3d(2px, 0, 0); }
                  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                  40%, 60% { transform: translate3d(4px, 0, 0); }
              }
            `}</style>
        </div>
    );
};
