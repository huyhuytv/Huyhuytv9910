
import React from 'react';
import type { CharacterCard } from '../../types';
import { Section } from '../ui/Section';
import { LabeledInput } from '../ui/LabeledInput';
import { LabeledTextarea } from '../ui/LabeledTextarea';

interface IdentitySectionProps {
    card: CharacterCard;
    onChange: (field: keyof CharacterCard, value: any) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ card, onChange }) => {
    return (
        <Section title="Thông tin cốt lõi" description="Định nghĩa cơ bản về danh tính nhân vật.">
            <LabeledInput 
                label="Tên" 
                value={card.name} 
                onChange={(e) => onChange('name', e.target.value)} 
            />
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Mô tả" 
                value={card.description} 
                onChange={(e) => onChange('description', e.target.value)} 
                rows={5} 
            />
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Tính cách" 
                value={card.personality || ''} 
                onChange={(e) => onChange('personality', e.target.value)} 
                rows={5} 
            />
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Vai trò (Persona)" 
                value={card.char_persona || ''} 
                onChange={(e) => onChange('char_persona', e.target.value)} 
                rows={5} 
            />
        </Section>
    );
};
