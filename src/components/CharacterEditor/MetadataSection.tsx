
import React, { useState, useEffect, useId } from 'react';
import type { CharacterCard } from '../../types';
import { Section } from '../ui/Section';
import { LabeledInput } from '../ui/LabeledInput';
import { LabeledTextarea } from '../ui/LabeledTextarea';
import { ToggleInput } from '../ui/ToggleInput';

interface MetadataSectionProps {
    card: CharacterCard;
    onChange: (field: keyof CharacterCard, value: any) => void;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ card, onChange }) => {
    const tagsInputId = useId();
    const [dynamicJsonFields, setDynamicJsonFields] = useState<Record<string, { value: string; isValid: boolean }>>({});

    // Identify dynamic fields
    const handledKeys = new Set([
        'name', 'description', 'personality', 'char_persona',
        'first_mes', 'mes_example',
        'scenario', 'system_prompt', 'post_history_instructions',
        'creator', 'character_version', 'tags',
        'creator_notes', 'creatorcomment',
        'char_book', 'character_book', 
        'attached_lorebooks',
        'alternate_greetings',
        'group_only_greetings',
        'extensions', 'data', 
        'spec', 'spec_version', 
        'create_date', 'avatar', 
    ]);
    const dynamicFields = Object.keys(card).filter(key => !handledKeys.has(key));

    useEffect(() => {
        const initialJsonFields: Record<string, { value: string; isValid: boolean }> = {};
        dynamicFields.forEach(key => {
            const value = card[key as keyof CharacterCard];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                initialJsonFields[key] = {
                    value: JSON.stringify(value, null, 2),
                    isValid: true
                };
            }
        });
        setDynamicJsonFields(initialJsonFields);
    }, [card, dynamicFields.join(',')]);

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
        onChange('tags', tags);
    };

    const handleDynamicJsonFieldChange = (key: string, stringValue: string) => {
        setDynamicJsonFields(prev => ({ ...prev, [key]: { ...prev[key], value: stringValue } }));
        try {
            const parsed = stringValue.trim() === '' ? null : JSON.parse(stringValue);
            setDynamicJsonFields(prev => ({ ...prev, [key]: { value: stringValue, isValid: true } }));
            onChange(key as keyof CharacterCard, parsed);
        } catch {
            setDynamicJsonFields(prev => ({ ...prev, [key]: { value: stringValue, isValid: false } }));
        }
    };

    return (
        <Section title="Siêu dữ liệu & Ghi chú" description="Thông tin bổ sung về thẻ nhân vật này.">
            <LabeledInput label="Người tạo" value={card.creator || ''} onChange={(e) => onChange('creator', e.target.value)} />
            <LabeledInput label="Phiên bản nhân vật" value={card.character_version || ''} onChange={(e) => onChange('character_version', e.target.value)} />
            
            <div className="col-span-full">
                <label htmlFor={tagsInputId} className="block text-sm font-medium text-slate-300 mb-1">Thẻ (phân tách bằng dấu phẩy)</label>
                <div className="relative">
                    <input
                        id={tagsInputId}
                        type="text"
                        value={card.tags?.join(', ') || ''}
                        onChange={handleTagsChange}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                        placeholder="fantasy, sci-fi, isekai"
                    />
                </div>
            </div>
            
            <LabeledTextarea containerClassName="col-span-full" label="Ghi chú của người tạo" value={card.creator_notes || ''} onChange={(e) => onChange('creator_notes', e.target.value)} />
            <LabeledTextarea containerClassName="col-span-full" label="Nhận xét của người tạo (V3)" value={card.creatorcomment || ''} onChange={(e) => onChange('creatorcomment', e.target.value)} />

            {/* Dynamic Fields */}
            {dynamicFields.length > 0 && (
                <div className="col-span-full border-t border-slate-700 pt-4 mt-2">
                    <h4 className="text-sm font-bold text-slate-400 mb-2">Trường dữ liệu mở rộng</h4>
                    <div className="grid grid-cols-1 gap-4">
                        {dynamicFields.map(key => {
                            const value = card[key as keyof CharacterCard] as any;
                            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                                return (
                                    <LabeledTextarea
                                        key={key}
                                        label={`${key} (Mỗi mục phân tách bằng '---')`}
                                        value={value.join('\n---\n')}
                                        onChange={(e) => onChange(key as keyof CharacterCard, e.target.value.split('\n---\n').map(g => g.trim()))}
                                        rows={5}
                                    />
                                );
                            }
                            if (typeof value === 'string') {
                                return <LabeledTextarea key={key} label={key} value={value} onChange={(e) => onChange(key as keyof CharacterCard, e.target.value)} />;
                            }
                            if (typeof value === 'boolean') {
                                return <div key={key}><ToggleInput label={key} checked={value} onChange={v => onChange(key as keyof CharacterCard, v)} /></div>;
                            }
                            if (typeof value === 'number') {
                                return <LabeledInput key={key} label={key} type="number" value={String(value)} onChange={(e) => onChange(key as keyof CharacterCard, parseFloat(e.target.value) || 0)} />;
                            }
                            if (typeof value === 'object' && value !== null) {
                                const fieldState = dynamicJsonFields[key] || { value: '', isValid: true };
                                return (
                                    <div key={key}>
                                        <LabeledTextarea 
                                            label={`JSON: ${key}`}
                                            value={fieldState.value} 
                                            onChange={(e) => handleDynamicJsonFieldChange(key, e.target.value)}
                                            rows={8} 
                                            className={`font-mono text-xs ${!fieldState.isValid ? 'border-red-500' : ''}`}
                                        />
                                        {!fieldState.isValid && <p className="text-sm text-red-400 mt-1">JSON không hợp lệ.</p>}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}
        </Section>
    );
};
