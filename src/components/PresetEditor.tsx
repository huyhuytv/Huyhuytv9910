
import React, { useCallback } from 'react';
import type { SillyTavernPreset } from '../types';
import { GeneralSettings } from './PresetEditor/GeneralSettings';
import { SamplingSettings } from './PresetEditor/SamplingSettings';
import { OutputSettings } from './PresetEditor/OutputSettings';
import { FormatSettings } from './PresetEditor/FormatSettings';
import { MiscSettings } from './PresetEditor/MiscSettings';

interface PresetEditorProps {
    preset: SillyTavernPreset;
    onUpdate: (preset: SillyTavernPreset) => void;
}

export const PresetEditor: React.FC<PresetEditorProps> = ({ preset, onUpdate }) => {
    const handleChange = useCallback((field: keyof SillyTavernPreset, value: any) => {
        onUpdate({ ...preset, [field]: value });
    }, [preset, onUpdate]);

    return (
        <div>
            <GeneralSettings preset={preset} onChange={handleChange} />
            <SamplingSettings preset={preset} onChange={handleChange} />
            <OutputSettings preset={preset} onChange={handleChange} />
            <FormatSettings preset={preset} onChange={handleChange} />
            <MiscSettings preset={preset} onChange={handleChange} />
        </div>
    );
}
