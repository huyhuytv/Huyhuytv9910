
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Lorebook } from '../types';
import { parseLorebookFile } from '../services/lorebookParser';
import * as dbService from '../services/dbService';

interface LorebookState {
  lorebooks: Lorebook[];
  isLoading: boolean;
  error: string;
}

interface LorebookActions {
  reloadLorebooks: () => Promise<void>;
  loadLorebooks: (files: FileList) => Promise<void>;
  addLorebook: (lorebook: Lorebook) => Promise<void>;
  updateLorebook: (lorebook: Lorebook) => Promise<void>;
  deleteLorebook: (name: string) => Promise<void>;
}

export const useLorebookStore = create<LorebookState & LorebookActions>()(
  immer((set, get) => ({
    lorebooks: [],
    isLoading: false,
    error: '',

    reloadLorebooks: async () => {
        set((state) => { state.isLoading = true; });
        try {
            const lorebooks = await dbService.getAllLorebooks();
            set((state) => {
                state.lorebooks = lorebooks;
                state.error = '';
            });
        } catch (err) {
            set((state) => { state.error = err instanceof Error ? err.message : 'Error loading lorebooks'; });
        } finally {
            set((state) => { state.isLoading = false; });
        }
    },

    loadLorebooks: async (files: FileList) => {
        set((state) => { state.isLoading = true; });
        const errors: string[] = [];
        const { lorebooks } = get();
        const existingNames = new Set(lorebooks.map(lb => lb.name));

        for (const file of Array.from(files)) {
            if (existingNames.has(file.name)) continue;
            try {
                const loaded = await parseLorebookFile(file);
                await dbService.saveLorebook(loaded);
                existingNames.add(file.name);
            } catch (err) {
                errors.push(file.name);
            }
        }

        // Reload full list
        const finalLorebooks = await dbService.getAllLorebooks();
        set((state) => {
            state.lorebooks = finalLorebooks;
            state.isLoading = false;
            if (errors.length > 0) state.error = `Failed to load: ${errors.join(', ')}`;
        });
    },

    addLorebook: async (lorebook: Lorebook) => {
        try {
            await dbService.saveLorebook(lorebook);
            set((state) => {
                if (!state.lorebooks.some(lb => lb.name === lorebook.name)) {
                    state.lorebooks.push(lorebook);
                }
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to add lorebook'; });
        }
    },

    updateLorebook: async (lorebook: Lorebook) => {
        try {
            await dbService.saveLorebook(lorebook);
            set((state) => {
                const idx = state.lorebooks.findIndex(lb => lb.name === lorebook.name);
                if (idx !== -1) state.lorebooks[idx] = lorebook;
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to update lorebook'; });
        }
    },

    deleteLorebook: async (name: string) => {
        try {
            await dbService.deleteLorebook(name);
            set((state) => {
                state.lorebooks = state.lorebooks.filter(lb => lb.name !== name);
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to delete lorebook'; });
        }
    }
  }))
);
