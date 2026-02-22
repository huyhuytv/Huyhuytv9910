
import React, { useState } from 'react';

interface GameHUDProps {
    variables: Record<string, any>;
    isOpen: boolean;
    onClose: () => void;
}

const RecursiveTree: React.FC<{ data: any; level?: number }> = ({ data, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Default open top levels

    if (typeof data === 'object' && data !== null) {
        const isArray = Array.isArray(data);
        const keys = Object.keys(data);
        
        if (keys.length === 0) {
            return <span className="text-slate-500 italic text-xs">{isArray ? '[]' : '{}'}</span>;
        }
        
        // Special handling for Tuple [Value, Desc] to show it cleanly
        if (isArray && data.length === 2 && typeof data[1] === 'string') {
            return (
                <span className="inline-flex gap-2 items-baseline">
                    <strong className="text-sky-300">{String(data[0])}</strong>
                    <span className="text-slate-500 text-[10px] italic">({data[1]})</span>
                </span>
            );
        }

        return (
            <div className="ml-2">
                <div 
                    className="cursor-pointer hover:text-sky-400 text-slate-400 select-none flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                >
                    <span className="text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                    <span className="text-xs font-semibold">{isArray ? `Array(${keys.length})` : 'Object'}</span>
                </div>
                
                {isExpanded && (
                    <div className="border-l border-slate-700 pl-2 ml-1">
                        {keys.map(key => (
                            <div key={key} className="mt-1">
                                <span className="text-indigo-300 text-xs mr-1">{key}:</span>
                                <RecursiveTree data={data[key]} level={level + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Primitive Values
    let valClass = 'text-slate-300';
    if (typeof data === 'number') valClass = 'text-amber-400 font-mono';
    else if (typeof data === 'boolean') valClass = 'text-purple-400 font-bold';
    else if (typeof data === 'string') valClass = 'text-green-300';

    return <span className={`${valClass} text-xs break-words`}>{String(data)}</span>;
};

export const GameHUD: React.FC<GameHUDProps> = ({ variables, isOpen, onClose }) => {
    if (!isOpen) return null;

    // Detect if this is a "V3" stat_data structure or flat variables
    // V3 often puts everything under 'stat_data'
    const dataToShow = variables.stat_data ? variables.stat_data : variables;
    const isEmpty = !dataToShow || Object.keys(dataToShow).length === 0;

    return (
        <div className="fixed top-16 right-4 bottom-20 w-80 z-40 flex flex-col pointer-events-none">
            <div className="pointer-events-auto bg-slate-800/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-full animate-slide-in-right">
                <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="text-lg">📊</span> Trạng thái (Game HUD)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar flex-grow bg-slate-900/30">
                    {isEmpty ? (
                        <div className="text-center text-slate-500 italic py-8">
                            <p>Chưa có dữ liệu biến số.</p>
                            <p className="text-[10px] mt-2">Bắt đầu trò chuyện để khởi tạo.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {Object.keys(dataToShow).map(key => (
                                <div key={key} className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-sky-400 font-bold text-xs mr-2 block mb-1 border-b border-slate-700/50 pb-1">{key}</span>
                                    <RecursiveTree data={dataToShow[key]} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-2 border-t border-slate-700 bg-slate-900/50 text-[10px] text-slate-500 text-center shrink-0">
                    Dữ liệu thô từ Memory Store
                </div>
            </div>
        </div>
    );
};
