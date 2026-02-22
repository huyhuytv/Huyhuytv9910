
import React, { useId } from 'react';
import { Tooltip } from '../Tooltip';
import { CopyButton } from './CopyButton';

interface LabeledInputProps {
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    tooltip?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const LabeledInput: React.FC<LabeledInputProps> = ({ 
    label, 
    value, 
    onChange, 
    type = 'text', 
    tooltip, 
    placeholder, 
    className = '',
    disabled = false
}) => {
    const id = useId();
    return (
        <div className={className}>
            <Tooltip text={tooltip}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1 cursor-help">{label}</label>
            </Tooltip>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {/* Only show copy button if there is a value */}
                {value !== '' && <CopyButton textToCopy={String(value)} absolute={true} />}
            </div>
        </div>
    );
};
