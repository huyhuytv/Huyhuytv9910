
import React from 'react';
import type { SillyTavernPreset } from '../../types';
import { Section } from '../ui/Section';
import { LabeledInput } from '../ui/LabeledInput';
import { ToggleInput } from '../ui/ToggleInput';
import { StringArrayInput } from '../ui/StringArrayInput';

interface OutputSettingsProps {
    preset: SillyTavernPreset;
    onChange: (field: keyof SillyTavernPreset, value: any) => void;
}

export const OutputSettings: React.FC<OutputSettingsProps> = ({ preset, onChange }) => (
    <>
        <Section title="Kiểm soát Tạo văn bản" description="Độ dài, token và điều kiện dừng.">
            <LabeledInput label="Max Tokens" value={preset.max_tokens ?? 2048} onChange={(e) => onChange('max_tokens', e.target.value)} type="text" />
            <LabeledInput label="Độ dài cắt bỏ (Context Limit)" value={preset.truncation_length ?? 4096} onChange={(e) => onChange('truncation_length', e.target.value)} type="text" />
            <div className="space-y-4">
                <ToggleInput label="Ban EOS Token" checked={preset.ban_eos_token ?? false} onChange={v => onChange('ban_eos_token', v)} />
                <ToggleInput label="Stream Response" checked={preset.stream_response ?? false} onChange={v => onChange('stream_response', v)} tooltip="Hiển thị văn bản ngay khi AI đang viết." />
            </div>
        </Section>

        <Section title="Dừng Chuỗi (Stopping Strings)" description="Các chuỗi khiến AI ngừng tạo văn bản.">
            <StringArrayInput label="Stopping Strings" values={preset.stopping_strings ?? []} onChange={v => onChange('stopping_strings', v)} />
            <StringArrayInput label="Custom Stopping Strings" values={preset.custom_stopping_strings ?? []} onChange={v => onChange('custom_stopping_strings', v)} />
        </Section>
    </>
);
