
import React from 'react';
import type { CharacterCard } from '../types';
import { useCharacterEditor } from '../hooks/useCharacterEditor';
import { IdentitySection } from './CharacterEditor/IdentitySection';
import { DialogueSection } from './CharacterEditor/DialogueSection';
import { ScenarioSection } from './CharacterEditor/ScenarioSection';
import { MetadataSection } from './CharacterEditor/MetadataSection';
import { LorebookSection } from './CharacterEditor/LorebookSection';
import { AdvancedSection } from './CharacterEditor/AdvancedSection';
import { RpgSection } from './CharacterEditor/RpgSection'; // NEW IMPORT

interface CharacterEditorProps {
  card: CharacterCard;
  onUpdate: (card: CharacterCard) => void;
  onOpenLorebook: () => void;
}

export const CharacterEditor: React.FC<CharacterEditorProps> = ({ card, onUpdate, onOpenLorebook }) => {
  const { 
      handleChange, 
      handleImportLorebook, 
      handleRegexScriptsUpdate, 
      handleTavernScriptsUpdate,
      availableLorebooks,
  } = useCharacterEditor(card, onUpdate);

  // Wrapper for extensions update if not exposed directly
  const handleExtensionsUpdate = (key: string, data: any) => {
      const newExtensions = { ...(card.extensions || {}) };
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          newExtensions[key] = data;
      } else {
          delete newExtensions[key];
      }
      onUpdate({ ...card, extensions: newExtensions });
  };

  return (
    <div className="space-y-4">
      <IdentitySection card={card} onChange={handleChange} />
      {/* RPG Section placed prominently after Identity */}
      <RpgSection card={card} onUpdate={onUpdate} />
      
      <DialogueSection card={card} onUpdate={onUpdate} onChange={handleChange} />
      <ScenarioSection card={card} onChange={handleChange} />
      <MetadataSection card={card} onChange={handleChange} />
      <LorebookSection 
          card={card} 
          availableLorebooks={availableLorebooks} 
          onOpenLorebook={onOpenLorebook} 
          onImport={handleImportLorebook} 
      />
      <AdvancedSection 
          card={card} 
          onRegexUpdate={handleRegexScriptsUpdate} 
          onTavernUpdate={handleTavernScriptsUpdate}
          onExtensionsUpdate={handleExtensionsUpdate}
      />
    </div>
  );
};
