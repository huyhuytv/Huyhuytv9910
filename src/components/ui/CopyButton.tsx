
import React, { useState } from 'react';

interface CopyButtonProps {
    textToCopy: string;
    className?: string;
    label?: string; // Optional text label (e.g. for DebugPanel)
    absolute?: boolean; // If true, positions absolute top-right (default for textareas)
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, className = '', label, absolute = true }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const baseClasses = absolute 
        ? "absolute top-2 right-2 p-1.5 rounded-md transition-colors" 
        : "px-2 py-1 rounded transition-colors border flex items-center gap-1";

    const defaultColor = "bg-slate-600/50 hover:bg-slate-500/70 text-slate-400 hover:text-white";
    
    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`${baseClasses} ${defaultColor} ${className}`}
            aria-label={label || "Sao chép"}
            title={copied ? "Đã sao chép!" : "Sao chép"}
        >
            {copied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {label && <span className="text-green-400 text-xs">Đã chép!</span>}
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {label && <span className="text-xs">{label}</span>}
                </>
            )}
        </button>
    );
};
