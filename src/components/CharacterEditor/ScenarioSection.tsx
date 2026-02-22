
import React from 'react';
import type { CharacterCard } from '../../types';
import { Section } from '../ui/Section';
import { LabeledTextarea } from '../ui/LabeledTextarea';

interface ScenarioSectionProps {
    card: CharacterCard;
    onChange: (field: keyof CharacterCard, value: any) => void;
}

export const ScenarioSection: React.FC<ScenarioSectionProps> = ({ card, onChange }) => {
    return (
        <Section title="Kịch bản & Lời nhắc" description="Bối cảnh, gợi ý hệ thống và các chỉ dẫn khác.">
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Kịch bản" 
                value={card.scenario || ''} 
                onChange={(e) => onChange('scenario', e.target.value)} 
            />
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Gợi ý hệ thống" 
                value={card.system_prompt || ''} 
                onChange={(e) => onChange('system_prompt', e.target.value)} 
            />
            <LabeledTextarea 
                containerClassName="col-span-full" 
                label="Chỉ dẫn sau lịch sử" 
                value={card.post_history_instructions || ''} 
                onChange={(e) => onChange('post_history_instructions', e.target.value)} 
            />
        </Section>
    );
};
