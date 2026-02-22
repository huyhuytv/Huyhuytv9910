
import React, { useId } from 'react';
import { Tooltip } from '../Tooltip';

interface Option {
    value: string | number;
    label: string;
}

interface SelectInputProps {
    label?: string; // Label is now optional to allow flexibility
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: Option[];
    tooltip?: string;
    className?: string;
    disabled?: boolean; // New prop
    placeholder?: string; // New prop
}

export const SelectInput: React.FC<SelectInputProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    tooltip, 
    className = '',
    disabled = false,
    placeholder
}) => {
    const id = useId();
    return (
        <div className={className}>
            <Tooltip text={tooltip}>
                {label && <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1 cursor-help">{label}</label>}
            </Tooltip>
            <select
                id={id}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt, idx) => (
                    <option key={`${opt.value}-${idx}`} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};
