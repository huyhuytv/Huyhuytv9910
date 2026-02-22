
import React from 'react';
import type { InteractiveErrorState } from '../types';

interface ErrorResolutionModalProps {
    errorState: InteractiveErrorState;
    onRetry: () => void;
    onIgnore: () => void;
}

export const ErrorResolutionModal: React.FC<ErrorResolutionModalProps> = ({ errorState, onRetry, onIgnore }) => {
    if (!errorState.hasError) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-red-900/30 p-4 border-b border-red-500/30 flex items-center gap-3">
                    <div className="p-2 bg-red-600 rounded-full text-white shadow-lg shadow-red-600/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-100">{errorState.title}</h3>
                        <p className="text-xs text-red-300">Hệ thống gặp sự cố cần bạn quyết định.</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {errorState.message}
                    </p>
                    
                    {errorState.errorDetails && (
                        <div className="bg-black/40 rounded-lg p-3 border border-red-500/20">
                            <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Chi tiết kỹ thuật:</p>
                            <code className="text-xs font-mono text-red-200 block whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar">
                                {errorState.errorDetails}
                            </code>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                    {errorState.canIgnore && (
                        <button 
                            onClick={onIgnore}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Bỏ qua (Tiếp tục)
                        </button>
                    )}
                    <button 
                        onClick={onRetry}
                        className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                        Thử lại
                    </button>
                </div>
            </div>
        </div>
    );
};
