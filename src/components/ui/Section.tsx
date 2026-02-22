
import React from 'react';

interface SectionProps {
    title: string;
    description?: string; // Optional now, and ignored in render
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const Section: React.FC<SectionProps> = ({ title, children, defaultOpen = true }) => (
    <details className="bg-slate-800/50 rounded-xl shadow-lg open:mb-4 transition-all duration-300 group" open={defaultOpen}>
        <summary className="p-4 cursor-pointer list-none flex justify-between items-center outline-none select-none hover:bg-slate-800/80 rounded-xl transition-colors">
            <h3 className="text-lg font-bold text-sky-400 group-hover:text-sky-300 transition-colors flex items-center gap-2">
                {title}
            </h3>
            <svg className="w-5 h-5 text-slate-500 transform transition-transform duration-300 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </summary>
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-700/50 mt-2">
            {children}
        </div>
    </details>
);
