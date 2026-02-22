
import React, { useState, useCallback, useId } from 'react';
import type { TavernHelperScript } from '../types';
import { ToggleInput } from './ui/ToggleInput';
import { CopyButton } from './ui/CopyButton';
import { LabeledInput } from './ui/LabeledInput';
import { LabeledTextarea } from './ui/LabeledTextarea';

interface TavernScriptItemProps {
    script: TavernHelperScript;
    index: number;
    onUpdate: (index: number, updatedScript: TavernHelperScript) => void;
    onRemove: (index: number) => void;
}

const TavernScriptItem: React.FC<TavernScriptItemProps> = ({ script, index, onUpdate, onRemove }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field: keyof TavernHelperScript['value'], value: any) => {
        onUpdate(index, { 
            ...script, 
            value: {
                ...script.value,
                [field]: value 
            }
        });
    };

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center p-3">
                <div className="flex items-center gap-2 flex-shrink-0 mr-4" onClick={(e) => e.stopPropagation()}>
                    <ToggleInput label="" checked={script.value.enabled} onChange={v => handleChange('enabled', v)} clean />
                </div>
                <div className="flex-grow cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <span className={`font-medium truncate ${script.value.enabled ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                        {script.value.name || 'Kịch bản không tên'}
                    </span>
                </div>
                <div className="flex items-center ml-4 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="text-slate-500 hover:text-red-400 transition-colors p-1" aria-label={`Xóa kịch bản "${script.value.name}"`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-slate-400" aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-slate-700/50 space-y-4">
                    <LabeledInput label="Tên Kịch bản" value={script.value.name || ''} onChange={e => handleChange('name', e.target.value)} />
                    <div className="relative">
                        <LabeledTextarea label="Nội dung" value={script.value.content || ''} onChange={e => handleChange('content', e.target.value)} rows={15} className="font-mono text-xs" />
                    </div>
                </div>
            )}
        </div>
    );
};

interface TavernScriptsEditorProps {
    scripts: TavernHelperScript[];
    onUpdate: (scripts: TavernHelperScript[]) => void;
}

export const TavernScriptsEditor: React.FC<TavernScriptsEditorProps> = ({ scripts = [], onUpdate }) => {
    const handleUpdateScript = useCallback((index: number, updatedScript: TavernHelperScript) => {
        const newScripts = [...scripts];
        newScripts[index] = updatedScript;
        onUpdate(newScripts);
    }, [scripts, onUpdate]);

    const handleRemoveScript = useCallback((index: number) => {
        const newScripts = scripts.filter((_, i) => i !== index);
        onUpdate(newScripts);
    }, [scripts, onUpdate]);

    const handleAddScript = useCallback(() => {
        const newScript: TavernHelperScript = {
            type: 'script',
            value: {
                id: `tavern_${Date.now()}`,
                name: 'Kịch bản Mới',
                content: '',
                enabled: true
            }
        };
        onUpdate([...scripts, newScript]);
    }, [scripts, onUpdate]);

    return (
        <div className="space-y-3">
            {scripts.map((script, index) => (
                <TavernScriptItem key={script.value.id || index} script={script} index={index} onUpdate={handleUpdateScript} onRemove={handleRemoveScript} />
            ))}
             <button onClick={handleAddScript} className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 border border-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                <span>Thêm Kịch bản Tavern Helper</span>
            </button>
        </div>
    );
};
