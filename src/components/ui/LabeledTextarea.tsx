
import React, { useId } from 'react';
import { Tooltip } from '../Tooltip';
import { CopyButton } from './CopyButton';

interface LabeledTextareaProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
    className?: string;
    containerClassName?: string;
    tooltip?: string;
    placeholder?: string;
}

export const LabeledTextarea: React.FC<LabeledTextareaProps> = ({ 
    label, 
    value, 
    onChange, 
    rows = 3, 
    className = '', 
    containerClassName = '', 
    tooltip,
    placeholder
}) => {
    const id = useId();
    return (
        <div className={containerClassName}>
            <Tooltip text={tooltip}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1 cursor-help">{label}</label>
            </Tooltip>
            <div className="relative">
                <textarea
                    id={id}
                    value={value}
                    onChange={onChange}
                    rows={rows}
                    placeholder={placeholder}
                    className={`w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono text-sm ${className}`}
                />
                <CopyButton textToCopy={value} absolute={true} />
            </div>
        </div>
    );
};
