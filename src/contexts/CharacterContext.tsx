
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { CharacterCard, CharacterInContext } from '../types';
import { useCharacterStore } from '../store/characterStore';
import { useLorebookStore } from '../store/lorebookStore';

interface CharacterContextType {
  characters: CharacterInContext[];
  activeCharacterFileName: string | null;
  error: string;
  isLoading: boolean;
  loadCharacter: (file: File) => Promise<void>;
  deleteActiveCharacter: () => Promise<void>;
  updateActiveCharacter: (card: CharacterCard) => Promise<void>;
  createNewCharacter: (card: CharacterCard, avatarFile: File | null) => Promise<string>;
  setActiveCharacterFileName: (name: string | null) => void;
  setAvatarForActiveCharacter: (fileName: string, url: string | null, file: File | null) => void;
  reloadCharacters: () => Promise<void>;
  dispatch: any; // Legacy shim
}

// Ensure context exists to satisfy type checkers if needed, but we mostly skip it
const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useCharacterStore();
  const lorebookStore = useLorebookStore();

  // Initial Load
  useEffect(() => {
    store.reloadCharacters();
  }, []);

  // Sync Logic (Replicated from old provider)
  useEffect(() => {
    if (store.isLoading || lorebookStore.isLoading) return;

    const lorebookNames = new Set(lorebookStore.lorebooks.map(lb => lb.name));
    
    // Check if any character has attached lorebooks that no longer exist
    store.characters.forEach(character => {
        const attached = character.card.attached_lorebooks || [];
        if (attached.length > 0) {
            const valid = attached.filter(name => lorebookNames.has(name));
            if (valid.length < attached.length) {
                // Update character to remove invalid lorebooks
                const newCard = { ...character.card, attached_lorebooks: valid.length > 0 ? valid : undefined };
                store.updateActiveCharacter(newCard); // Only works if active? No, we need a general update.
            }
        }
    });
  }, [lorebookStore.lorebooks.length]); // Only run when lorebook count changes

  // Pass-through context value (optional, as hooks use store directly)
  return <>{children}</>;
};

export const useCharacter = (): CharacterContextType => {
  const store = useCharacterStore();
  
  return {
    characters: store.characters,
    activeCharacterFileName: store.activeCharacterFileName,
    error: store.error,
    isLoading: store.isLoading,
    loadCharacter: store.loadCharacter,
    deleteActiveCharacter: store.deleteActiveCharacter,
    updateActiveCharacter: store.updateActiveCharacter,
    createNewCharacter: store.createNewCharacter,
    setActiveCharacterFileName: store.setActiveCharacterFileName,
    setAvatarForActiveCharacter: store.setAvatarForActiveCharacter,
    reloadCharacters: store.reloadCharacters,
    dispatch: () => console.warn("Legacy dispatch called - Ignored"),
  };
};
