
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CharacterCard, CharacterInContext } from '../types';
import { parseCharacterFile, processRawCard } from '../services/cardParser';
import { normalizeCharacterBook } from '../services/lorebookParser';
import * as dbService from '../services/dbService';
import { defaultCharacterRaw } from '../data/defaultCharacter';
import { useLorebookStore } from './lorebookStore';

interface CharacterState {
  characters: CharacterInContext[];
  activeCharacterFileName: string | null;
  isLoading: boolean;
  error: string;
}

interface CharacterActions {
  reloadCharacters: () => Promise<void>;
  loadCharacter: (file: File) => Promise<void>;
  deleteActiveCharacter: () => Promise<void>;
  updateActiveCharacter: (card: CharacterCard) => Promise<void>;
  createNewCharacter: (card: CharacterCard, avatarFile: File | null) => Promise<string>;
  setActiveCharacterFileName: (name: string | null) => void;
  setAvatarForActiveCharacter: (fileName: string, url: string | null, file: File | null) => Promise<void>;
}

export const useCharacterStore = create<CharacterState & CharacterActions>()(
  immer((set, get) => ({
    characters: [],
    activeCharacterFileName: null,
    isLoading: true,
    error: '',

    reloadCharacters: async () => {
      set((state) => { state.isLoading = true; });
      try {
        let storedCharacters = await dbService.getAllCharacters();

        if (storedCharacters.length === 0) {
            const defaultCard = processRawCard(defaultCharacterRaw);
            const defaultFileName = "Tuệ Thu Sinh (Mặc định).json";
            
            const defaultCharacter: CharacterInContext = {
              card: defaultCard,
              fileName: defaultFileName,
              avatarUrl: null,
              avatarFile: null,
            };
            
            const storable = await dbService.characterToStorable(defaultCharacter);
            await dbService.saveCharacter(storable);
            storedCharacters = await dbService.getAllCharacters();
        }
        
        const charactersInContext: CharacterInContext[] = storedCharacters.map(stored => {
          let avatarUrl: string | null = null;
          let avatarFile: File | null = null;
          if (stored.avatar) {
            avatarFile = new File([stored.avatar.buffer], stored.avatar.name, { type: stored.avatar.type });
            avatarUrl = URL.createObjectURL(avatarFile);
          }
          return { card: stored.card, fileName: stored.fileName, avatarUrl, avatarFile };
        });

        set((state) => {
            state.characters = charactersInContext;
            if (charactersInContext.length > 0 && !state.activeCharacterFileName) {
                state.activeCharacterFileName = charactersInContext[0].fileName;
            }
            state.error = '';
        });
      } catch (err) {
        set((state) => { state.error = err instanceof Error ? err.message : 'Error loading characters'; });
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },

    loadCharacter: async (file: File) => {
      set((state) => { state.error = ''; });
      try {
        const { card, avatarUrl } = await parseCharacterFile(file);
        const avatarFile = avatarUrl ? file : null;

        // Instructional logic fix
        if (
          card.alternate_greetings &&
          card.alternate_greetings.length > 0 &&
          card.first_mes &&
          card.first_mes.length > 300 && 
          card.first_mes.trim().startsWith('#')
        ) {
          card.first_mes = card.alternate_greetings[0];
        }

        const character: CharacterInContext = { card, fileName: file.name, avatarUrl, avatarFile };
        
        // Save to DB
        const storable = await dbService.characterToStorable(character);
        await dbService.saveCharacter(storable);

        // Auto-extract Lorebook to World Store
        if (card.char_book && card.char_book.entries && card.char_book.entries.length > 0) {
            const normalizedBook = normalizeCharacterBook(card.char_book);
            // Use the Lorebook Store directly
            useLorebookStore.getState().addLorebook({
                name: `[Nhân vật] ${card.name}.json`,
                book: JSON.parse(JSON.stringify(normalizedBook)),
            });
        }

        set((state) => {
            // Remove existing if overwrite
            const existingIdx = state.characters.findIndex(c => c.fileName === file.name);
            if (existingIdx !== -1) {
                 if (state.characters[existingIdx].avatarUrl && state.characters[existingIdx].avatarUrl !== avatarUrl) {
                     URL.revokeObjectURL(state.characters[existingIdx].avatarUrl!);
                 }
                 state.characters[existingIdx] = character;
            } else {
                 state.characters.push(character);
            }
            state.activeCharacterFileName = file.name;
        });

      } catch (err) {
        set((state) => { state.error = err instanceof Error ? err.message : 'Unknown error importing character'; });
      }
    },

    createNewCharacter: async (card: CharacterCard, avatarFile: File | null) => {
        set((state) => { state.error = ''; });
        try {
            // Sanitize filename
            const safeName = card.name.trim().replace(/[^a-z0-9\u00C0-\u017F\s-]/gi, '_');
            const extension = avatarFile ? '.png' : '.json';
            const fileName = `${safeName || 'New_Character'}${extension}`;

            let avatarUrl: string | null = null;
            if (avatarFile) {
                avatarUrl = URL.createObjectURL(avatarFile);
            }

            const character: CharacterInContext = { card, fileName, avatarUrl, avatarFile };
            const storable = await dbService.characterToStorable(character);
            
            await dbService.saveCharacter(storable);

            set((state) => {
                state.characters.push(character);
                state.activeCharacterFileName = fileName;
            });
            return fileName;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to create character';
            set((state) => { state.error = msg; });
            throw new Error(msg);
        }
    },

    deleteActiveCharacter: async () => {
        const { activeCharacterFileName, characters } = get();
        if (!activeCharacterFileName) return;

        try {
            // 1. Cascade Delete: Chat Sessions linked to this character (Clean up orphaned data)
            // Lấy tất cả session, tìm cái nào có characterFileName trùng khớp và xóa.
            const allSessions = await dbService.getAllChatSessions();
            const relatedSessions = allSessions.filter(s => s.characterFileName === activeCharacterFileName);
            
            if (relatedSessions.length > 0) {
                console.log(`[Auto-Clean] Deleting ${relatedSessions.length} chat sessions linked to ${activeCharacterFileName}`);
                await Promise.all(relatedSessions.map(s => dbService.deleteChatSession(s.sessionId)));
            }

            // 2. Delete the Character
            await dbService.deleteCharacter(activeCharacterFileName);
            
            set((state) => {
                const charToDelete = state.characters.find(c => c.fileName === activeCharacterFileName);
                if (charToDelete?.avatarUrl) URL.revokeObjectURL(charToDelete.avatarUrl);
                
                state.characters = state.characters.filter(c => c.fileName !== activeCharacterFileName);
                
                if (state.activeCharacterFileName === activeCharacterFileName) {
                    state.activeCharacterFileName = state.characters.length > 0 ? state.characters[0].fileName : null;
                }
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to delete character'; });
        }
    },

    updateActiveCharacter: async (card: CharacterCard) => {
        const { activeCharacterFileName, characters } = get();
        const activeChar = characters.find(c => c.fileName === activeCharacterFileName);
        if (!activeChar) return;

        const updatedChar = { ...activeChar, card };
        
        try {
            const storable = await dbService.characterToStorable(updatedChar);
            await dbService.saveCharacter(storable);
            
            set((state) => {
                const idx = state.characters.findIndex(c => c.fileName === activeCharacterFileName);
                if (idx !== -1) {
                    state.characters[idx] = updatedChar;
                }
            });
        } catch (e) {
            console.error("Failed to update character", e);
        }
    },

    setActiveCharacterFileName: (name) => {
        set((state) => { state.activeCharacterFileName = name; });
    },

    setAvatarForActiveCharacter: async (fileName, url, file) => {
        const { characters } = get();
        const character = characters.find(c => c.fileName === fileName);
        if (!character) return;

        const updatedCharacter = { ...character, avatarUrl: url, avatarFile: file };
        
        try {
            const storable = await dbService.characterToStorable(updatedCharacter);
            await dbService.saveCharacter(storable);
            
            set((state) => {
                const idx = state.characters.findIndex(c => c.fileName === fileName);
                if (idx !== -1) state.characters[idx] = updatedCharacter;
            });
        } catch (e) {
            console.error("Failed to save avatar", e);
        }
    }
  }))
);
