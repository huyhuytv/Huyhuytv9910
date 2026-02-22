
import React, { useState, useRef, useEffect } from 'react';
import type { RPGColumn } from '../../types/rpg';

// --- EDITABLE CELL ---

interface EditableCellProps {
    value: any;
    column: RPGColumn;
    onSave: (value: any) => void;
    className?: string;
    isEditing?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, column, onSave, className = '' }) => {
    const [isLocalEditing, setIsLocalEditing] = useState(false);
    const [tempValue, setTempValue] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync value on prop change
    useEffect(() => {
        setTempValue(String(value ?? ''));
    }, [value]);

    useEffect(() => {
        if (isLocalEditing && inputRef.current) {
            inputRef.current.focus();
            if (column.type !== 'boolean') {
                inputRef.current.select();
            }
        }
    }, [isLocalEditing, column.type]);

    const handleStartEditing = () => {
        setTempValue(String(value ?? ''));
        setIsLocalEditing(true);
    };

    const handleSave = () => {
        let finalVal: any = tempValue;
        
        if (column.type === 'number') {
            finalVal = parseFloat(tempValue);
            if (isNaN(finalVal)) finalVal = 0;
        } else if (column.type === 'boolean') {
            finalVal = tempValue === 'true';
        }

        if (finalVal !== value) {
            onSave(finalVal);
        }
        setIsLocalEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setTempValue(String(value ?? ''));
            setIsLocalEditing(false);
        }
    };

    // --- RENDERERS ---

    if (column.type === 'boolean') {
        const isChecked = value === true || value === 'true';
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{column.label}</span>
                <div 
                    className={`flex items-center cursor-pointer p-2 rounded transition-all duration-200 border ${isChecked ? 'bg-sky-900/20 border-sky-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'}`}
                    onClick={() => onSave(!isChecked)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-sky-500 border-sky-400' : 'bg-slate-800 border-slate-600'}`}>
                         {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${isChecked ? 'text-sky-300' : 'text-slate-400'}`}>{isChecked ? 'Có (Yes)' : 'Không (No)'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{column.label}</span>
            {isLocalEditing ? (
                <input
                    ref={inputRef}
                    type={column.type === 'number' ? 'number' : 'text'}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-slate-900 text-white border border-sky-500 rounded px-3 py-2 text-sm outline-none shadow-lg focus:ring-1 focus:ring-sky-500"
                />
            ) : (
                <div 
                    onClick={handleStartEditing}
                    className="w-full min-h-[2.5rem] px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:text-white cursor-text transition-all rounded border border-slate-700 hover:border-sky-500/50 break-words whitespace-pre-wrap bg-slate-800/30 flex items-center"
                    role="textbox"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleStartEditing(); }}
                    title="Nhấn để chỉnh sửa"
                >
                    {value === null || value === undefined || value === '' ? <span className="text-slate-600 italic text-xs">Trống (Nhấn để nhập)</span> : String(value)}
                </div>
            )}
        </div>
    );
};

// --- ACCORDION ROW ITEM ---

interface RpgRowItemProps {
    row: any[]; // [UUID, Col1, Col2...]
    columns: RPGColumn[];
    rowIndex: number;
    onCellUpdate: (colIndex: number, value: any) => void;
    onToggleDelete: () => void;
    onRestore: () => void;
    isPendingDelete: boolean;
    // New Props for external control
    isExpanded: boolean;
    onToggleExpand: () => void;
}

export const RpgRowItem: React.FC<RpgRowItemProps> = ({ 
    row, 
    columns, 
    rowIndex, 
    onCellUpdate, 
    onToggleDelete, 
    onRestore,
    isPendingDelete,
    isExpanded,
    onToggleExpand
}) => {
    
    // Get primary display value (Column 0, which corresponds to row index 1)
    const primaryValue = row[1]; 

    if (isPendingDelete) {
        return (
            <div className="mb-2 flex items-center justify-between p-3 bg-red-900/10 border border-red-900/30 rounded-lg animate-pulse transition-all select-none">
                <div className="flex items-center gap-3 overflow-hidden text-red-400">
                     <span className="text-xs font-mono opacity-50 w-6 text-center">#{rowIndex + 1}</span>
                     <span className="text-sm font-medium line-through truncate opacity-70">
                         {primaryValue || '(Dữ liệu trống)'}
                     </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onRestore(); }}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded border border-slate-600 transition-colors flex items-center gap-1 shadow-sm hover:shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    Hoàn tác
                </button>
            </div>
        );
    }

    return (
        <div className="mb-2">
            {/* Split Button Header */}
            <div className="flex items-stretch rounded-lg shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
                
                {/* 1. Main Expand Button */}
                <button
                    onClick={onToggleExpand}
                    className={`flex-grow flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 border border-r-0 rounded-l-lg outline-none focus:ring-2 focus:ring-sky-500/50 group ${
                        isExpanded
                            ? 'bg-slate-700 border-slate-600 text-sky-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white hover:border-slate-600'
                    }`}
                >
                    {/* Icon */}
                    <div className={`transition-transform duration-200 text-slate-500 group-hover:text-sky-400 ${isExpanded ? 'rotate-90 text-sky-400' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    
                    {/* Index */}
                    <span className="font-mono text-xs text-slate-500 w-6 text-center">#{rowIndex + 1}</span>
                    
                    {/* Title */}
                    <span className={`font-bold text-sm truncate flex-grow ${!primaryValue ? 'italic opacity-50' : ''}`}>
                        {primaryValue || '(Chưa đặt tên)'}
                    </span>
                    
                    {/* Expand Hint (Optional, shows only on hover) */}
                    <span className="text-[10px] uppercase font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                    </span>
                </button>

                {/* 2. Delete Button (Separate Block) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleDelete(); }}
                    className={`px-3 flex items-center justify-center border rounded-r-lg transition-all duration-200 outline-none focus:ring-2 focus:ring-red-500/50 active:bg-slate-900 ${
                         isExpanded
                            ? 'bg-slate-700 border-slate-600 text-slate-500 hover:text-red-400 hover:bg-slate-600'
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400 hover:bg-slate-750 hover:border-slate-600'
                    }`}
                    title="Xóa dòng này"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Body / Detailed View - FORM MODE */}
            {isExpanded && (
                <div className="relative mt-1 mx-1 p-4 bg-slate-900/80 border border-slate-700 rounded-b-lg border-t-0 shadow-inner animate-slide-in-down before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-600 before:to-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        {columns.map((col, idx) => (
                            <EditableCell 
                                key={col.id}
                                value={row[idx + 1]} // Skip UUID (0), start at 1
                                column={col}
                                onSave={(val) => onCellUpdate(idx, val)} // Index corresponds to column array index
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
