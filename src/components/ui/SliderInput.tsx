
import React, { useId } from 'react';
import { Tooltip } from '../Tooltip';

interface SliderInputProps {
    label: string;
    value: number | string;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    tooltip?: string;
    className?: string;
}

export const SliderInput: React.FC<SliderInputProps> = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step, 
    tooltip, 
    className = '' 
}) => {
    const id = useId();
    
    // Ensure value is a number for the range input
    const numValue = typeof value === 'number' ? value : (parseFloat(value) || min);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            onChange(val);
        }
    };

    return (
        <div className={className}>
            <Tooltip text={tooltip}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1 cursor-help">{label}</label>
            </Tooltip>
            <div className="flex items-center gap-4">
                <input
                    id={id}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={numValue}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <input
                    type="number"
                    value={value}
                    onChange={handleTextChange}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-md p-1 text-slate-200 text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono text-sm"
                />
            </div>
        </div>
    );
};
