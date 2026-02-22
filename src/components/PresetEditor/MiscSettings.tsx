
import React, { useState, useEffect } from 'react';
import type { SillyTavernPreset } from '../../types';
import { Section } from '../ui/Section';
import { SliderInput } from '../ui/SliderInput';
import { ToggleInput } from '../ui/ToggleInput';
import { LabeledTextarea } from '../ui/LabeledTextarea';

interface MiscSettingsProps {
    preset: SillyTavernPreset;
    onChange: (field: keyof SillyTavernPreset, value: any) => void;
}

export const MiscSettings: React.FC<MiscSettingsProps> = ({ preset, onChange }) => {
    const [extensionsJson, setExtensionsJson] = useState(JSON.stringify(preset.extensions, null, 2) || '{}');
    const [isValid, setIsValid] = useState(true);

    useEffect(() => {
        // Only update from props if the prop value is effectively different from what we parsed last time
        // This prevents cursor jumping, but here we just sync on mount or preset switch
        // To be safe against external updates, we keep this, but the handleJsonChange fix below solves the empty string issue.
        setExtensionsJson(JSON.stringify(preset.extensions, null, 2) || '{}');
        setIsValid(true);
    }, [preset.extensions]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setExtensionsJson(val);

        // Fix: Treat empty string as valid empty object to prevent revert logic
        if (!val.trim()) {
            onChange('extensions', {});
            setIsValid(true);
            return;
        }

        try {
            const parsed = JSON.parse(val);
            onChange('extensions', parsed);
            setIsValid(true);
        } catch {
            setIsValid(false);
        }
    };

    return (
        <>
            <Section title="Thử nghiệm & Khác" description="Thinking Budget và các tùy chọn khác.">
                <SliderInput label="Thinking Budget" value={preset.thinking_budget ?? 0} onChange={v => onChange('thinking_budget', v)} min={0} max={32768} step={1024} tooltip="Token dành cho suy nghĩ (Gemini 2.5+)." />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleInput label="Wrap in Quotes" checked={preset.wrap_in_quotes ?? false} onChange={v => onChange('wrap_in_quotes', v)} />
                    <ToggleInput label="Max Context Unlocked" checked={preset.max_context_unlocked ?? false} onChange={v => onChange('max_context_unlocked', v)} />
                    <ToggleInput label="Squash System Messages" checked={preset.squash_system_messages ?? true} onChange={v => onChange('squash_system_messages', v)} />
                    <ToggleInput label="Bypass Status Check" checked={preset.bypass_status_check ?? true} onChange={v => onChange('bypass_status_check', v)} />
                </div>
            </Section>

            <Section title="Phần mở rộng (JSON)" description="Dữ liệu cấu hình thô.">
                <LabeledTextarea 
                    label="Extensions JSON" 
                    value={extensionsJson} 
                    onChange={handleJsonChange} 
                    rows={10} 
                    containerClassName="md:col-span-2"
                    className={!isValid ? 'border-red-500' : ''}
                />
                {!isValid && <p className="text-xs text-red-400 mt-1">JSON không hợp lệ (Dữ liệu cũ sẽ được giữ nguyên cho đến khi bạn sửa lại).</p>}
            </Section>
        </>
    );
};
