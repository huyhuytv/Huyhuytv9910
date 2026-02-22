
import React from 'react';

interface FilterButtonProps<T extends string> {
    filter: T;
    currentFilter: T;
    onClick: (filter: T) => void;
    label: string;
    count?: number;
}

export function FilterButton<T extends string>({ filter, currentFilter, onClick, label, count }: FilterButtonProps<T>) {
    return (
        <button
            onClick={() => onClick(filter)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${
                currentFilter === filter
                    ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-400'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
        >
            {label}
            {count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${currentFilter === filter ? 'bg-sky-800 text-sky-100' : 'bg-slate-800 text-slate-500'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}
