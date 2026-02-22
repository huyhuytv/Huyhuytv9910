
import React from 'react';
import type { SillyTavernPreset } from '../../types';
import { Section } from '../ui/Section';
import { LabeledInput } from '../ui/LabeledInput';
import { LabeledTextarea } from '../ui/LabeledTextarea';

interface FormatSettingsProps {
    preset: SillyTavernPreset;
    onChange: (field: keyof SillyTavernPreset, value: any) => void;
}

export const FormatSettings: React.FC<FormatSettingsProps> = ({ preset, onChange }) => (
    <Section title="Chế độ Instruct & Định dạng" description="Cấu hình khuôn mẫu cho lời nhắc.">
        <LabeledInput label="WI Format" value={preset.wi_format || ''} onChange={(e) => onChange('wi_format', e.target.value)} tooltip="Mẫu chèn World Info: {{keys}} {{content}}" />
        <LabeledInput label="Scenario Format" value={preset.scenario_format || ''} onChange={(e) => onChange('scenario_format', e.target.value)} />
        <LabeledInput label="Personality Format" value={preset.personality_format || ''} onChange={(e) => onChange('personality_format', e.target.value)} />
        <LabeledTextarea label="Mẫu Instruct" value={preset.instruct_template || ''} onChange={(e) => onChange('instruct_template', e.target.value)} rows={8} containerClassName="md:col-span-2" />
        <LabeledTextarea label="New Chat Prompt" value={preset.new_chat_prompt || ''} onChange={(e) => onChange('new_chat_prompt', e.target.value)} rows={4} containerClassName="md:col-span-2" />
    </Section>
);
