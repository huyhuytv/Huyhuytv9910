
import React from 'react';
import { Tooltip } from '../Tooltip';
import { CopyButton } from './CopyButton';

interface StringArrayInputProps {
    label: string;
    values: string[];
    onChange: (values: string[]) => void;
    tooltipText?: string;
    placeholder?: string;
}

export const StringArrayInput: React.FC<StringArrayInputProps> = ({ label, values = [], onChange, tooltipText, placeholder }) => {
    const handleAdd = () => onChange([...values, '']);
    const handleRemove = (index: number) => onChange(values.filter((_, i) => i !== index));
    const handleUpdate = (index: number, value: string) => {
        const newValues = [...values];
        newValues[index] = value;
        onChange(newValues);
    };

    return (
        <div className="space-y-3">
            <Tooltip text={tooltipText}>
                <label className="block text-sm font-medium text-slate-300 cursor-help">{label}</label>
            </Tooltip>
            <div className="space-y-2">
                {values.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="relative flex-grow">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleUpdate(index, e.target.value)}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                placeholder={placeholder}
                            />
                            <CopyButton textToCopy={value} absolute={true} />
                        </div>
                        <button
                            onClick={() => handleRemove(index)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-700 rounded-md hover:bg-slate-600"
                            aria-label={`Xóa dòng số ${index + 1}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                ))}
            </div>
            <button
                onClick={handleAdd}
                className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 border border-slate-600 border-dashed"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                <span>Thêm dòng mới</span>
            </button>
        </div>
    );
};
