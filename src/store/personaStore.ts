
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UserPersona } from '../types';
import * as dbService from '../services/dbService';

const ACTIVE_PERSONA_ID_KEY = 'sillyTavernStudio_activePersonaId';

const defaultUserPersona: UserPersona = {
  id: 'default_persona_hai',
  name: 'Hải',
  description: '',
};

interface PersonaState {
  personas: UserPersona[];
  activePersonaId: string | null;
  isLoading: boolean;
  error: string;
}

interface PersonaActions {
  reloadPersonas: () => Promise<void>;
  addOrUpdatePersona: (persona: UserPersona) => Promise<void>;
  deletePersona: (personaId: string) => Promise<void>;
  setActivePersonaId: (id: string | null) => void;
}

export const usePersonaStore = create<PersonaState & PersonaActions>()(
  immer((set, get) => ({
    personas: [],
    activePersonaId: null,
    isLoading: true,
    error: '',

    reloadPersonas: async () => {
        set((state) => { state.isLoading = true; });
        try {
            let personas = await dbService.getAllUserPersonas();
            
            if (personas.length === 0) {
                await dbService.saveUserPersona(defaultUserPersona);
                personas = [defaultUserPersona];
            }

            const savedActiveId = localStorage.getItem(ACTIVE_PERSONA_ID_KEY);
            let activeId = savedActiveId;

            // Validate saved ID
            if (savedActiveId && !personas.some(p => p.id === savedActiveId)) {
                activeId = null;
            }
            // Auto select if none
            if (!activeId && personas.length > 0) {
                activeId = personas[0].id;
                localStorage.setItem(ACTIVE_PERSONA_ID_KEY, activeId);
            }

            set((state) => {
                state.personas = personas;
                state.activePersonaId = activeId;
                state.error = '';
            });
        } catch (err) {
            set((state) => { state.error = err instanceof Error ? err.message : 'Error loading personas'; });
        } finally {
            set((state) => { state.isLoading = false; });
        }
    },

    addOrUpdatePersona: async (persona: UserPersona) => {
        try {
            await dbService.saveUserPersona(persona);
            set((state) => {
                const idx = state.personas.findIndex(p => p.id === persona.id);
                if (idx !== -1) state.personas[idx] = persona;
                else state.personas.push(persona);
            });
        } catch (e) {
            set((state) => { state.error = 'Failed to save persona'; });
        }
    },

    deletePersona: async (personaId: string) => {
        try {
            await dbService.deleteUserPersona(personaId);
            set((state) => {
                state.personas = state.personas.filter(p => p.id !== personaId);
                if (state.activePersonaId === personaId) {
                    state.activePersonaId = null;
                    localStorage.removeItem(ACTIVE_PERSONA_ID_KEY);
                }
            });
        } catch (e) {
            set((state) => { state.error = 'Failed to delete persona'; });
        }
    },

    setActivePersonaId: (id: string | null) => {
        if (id) localStorage.setItem(ACTIVE_PERSONA_ID_KEY, id);
        else localStorage.removeItem(ACTIVE_PERSONA_ID_KEY);
        set((state) => { state.activePersonaId = id; });
    }
  }))
);
