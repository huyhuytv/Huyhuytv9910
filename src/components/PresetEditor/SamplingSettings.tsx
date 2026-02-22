
import React from 'react';
import type { SillyTavernPreset } from '../../types';
import { Section } from '../ui/Section';
import { SliderInput } from '../ui/SliderInput';
import { SelectInput } from '../ui/SelectInput';

interface SamplingSettingsProps {
    preset: SillyTavernPreset;
    onChange: (field: keyof SillyTavernPreset, value: any) => void;
}

export const SamplingSettings: React.FC<SamplingSettingsProps> = ({ preset, onChange }) => (
    <>
        <Section title="Sampling Cốt lõi" description="Kiểm soát sự sáng tạo và tính mạch lạc.">
            <SliderInput label="Nhiệt độ (Temperature)" value={preset.temp ?? 1} onChange={v => onChange('temp', v)} min={0} max={2} step={0.01} tooltip="Độ ngẫu nhiên. Cao = Sáng tạo, Thấp = Chính xác." />
            <SliderInput label="Top P" value={preset.top_p ?? 0.9} onChange={v => onChange('top_p', v)} min={0} max={1} step={0.01} tooltip="Nucleus Sampling. Giới hạn tập hợp từ vựng." />
            <SliderInput label="Top K" value={preset.top_k ?? 0} onChange={v => onChange('top_k', v)} min={0} max={100} step={1} tooltip="Giới hạn K từ có xác suất cao nhất." />
            <SliderInput label="Typical P" value={preset.typical_p ?? 1} onChange={v => onChange('typical_p', v)} min={0} max={1} step={0.01} tooltip="Loại bỏ token không điển hình." />
        </Section>

        <Section title="Sampling Nâng cao" description="Các tham số tinh chỉnh sâu.">
            <SliderInput label="Min P" value={preset.min_p ?? 0} onChange={v => onChange('min_p', v)} min={0} max={1} step={0.01} tooltip="Ngưỡng xác suất tối thiểu." />
            <SliderInput label="Repetition Penalty" value={preset.repetition_penalty ?? 1.1} onChange={v => onChange('repetition_penalty', v)} min={1} max={2} step={0.01} tooltip="Phạt lặp lại từ." />
            <SliderInput label="Frequency Penalty" value={preset.frequency_penalty ?? 0} onChange={v => onChange('frequency_penalty', v)} min={0} max={2} step={0.01} />
            <SliderInput label="Presence Penalty" value={preset.presence_penalty ?? 0} onChange={v => onChange('presence_penalty', v)} min={0} max={2} step={0.01} />
        </Section>

        <Section title="Mirostat" description="Thuật toán kiểm soát sự ngạc nhiên (Perplexity).">
            <SelectInput
                label="Chế độ Mirostat"
                value={preset.mirostat_mode ?? 0}
                onChange={(e) => onChange('mirostat_mode', parseInt(e.target.value, 10))}
                options={[{ value: 0, label: 'Tắt' }, { value: 1, label: 'V1' }, { value: 2, label: 'V2' }]}
            />
            <SliderInput label="Mirostat Tau" value={preset.mirostat_tau ?? 5} onChange={v => onChange('mirostat_tau', v)} min={0} max={10} step={0.1} />
            <SliderInput label="Mirostat ETA" value={preset.mirostat_eta ?? 0.1} onChange={v => onChange('mirostat_eta', v)} min={0} max={1} step={0.01} />
        </Section>
    </>
);
