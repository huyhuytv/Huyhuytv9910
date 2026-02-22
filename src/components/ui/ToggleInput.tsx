
import React, { useId } from 'react';
import { Tooltip } from '../Tooltip';

interface ToggleInputProps {
    label?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    tooltip?: string;
    disabled?: boolean;
    className?: string;
    clean?: boolean; // New prop for removing background/padding
}

export const ToggleInput: React.FC<ToggleInputProps> = ({ 
    label, 
    checked, 
    onChange, 
    tooltip, 
    disabled, 
    className = '',
    clean = false 
}) => {
    const id = useId();
    const baseStyle = clean 
        ? "flex items-center justify-between" 
        : "flex items-center justify-between bg-slate-700/50 p-3 rounded-lg";

    return (
        <div className={`${baseStyle} ${className}`}>
            <div className="flex-grow mr-3">
                <Tooltip text={tooltip}>
                    {label && (
                        <label 
                            id={id} 
                            className={`text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-300 cursor-help'}`}
                        >
                            {label}
                        </label>
                    )}
                </Tooltip>
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); !disabled && onChange(!checked); }}
                className={`${
                    checked ? 'bg-sky-500' : 'bg-slate-600'
                } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={checked}
                aria-labelledby={id}
            >
                <span
                    aria-hidden="true"
                    className={`${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
    );
};
