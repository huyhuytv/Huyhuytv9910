
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { SillyTavernPreset } from '../types';
import { parsePresetFile } from '../services/presetParser';
import * as dbService from '../services/dbService';
import defaultPreset from '../data/defaultPreset';

interface PresetState {
  presets: SillyTavernPreset[];
  activePresetName: string | null;
  isLoading: boolean;
  error: string;
}

interface PresetActions {
  reloadPresets: () => Promise<void>;
  addPreset: (file: File) => Promise<void>;
  deleteActivePreset: () => Promise<void>;
  updateActivePreset: (preset: SillyTavernPreset) => Promise<void>;
  setActivePresetName: (name: string | null) => void;
  revertActivePreset: () => Promise<void>;
  duplicatePreset: (originalName: string, newName: string) => Promise<void>;
  createPreset: (name: string) => Promise<void>;
  renamePreset: (oldName: string, newName: string) => Promise<void>;
}

export const usePresetStore = create<PresetState & PresetActions>()(
  immer((set, get) => ({
    presets: [],
    activePresetName: null,
    isLoading: true,
    error: '',

    reloadPresets: async () => {
      set((state) => { state.isLoading = true; });
      try {
        let presets = await dbService.getAllPresets();
        let needsSave = false;

        // Ensure default exists
        if (!presets.some(p => p.name === defaultPreset.name)) {
          await dbService.savePreset(defaultPreset);
          presets.unshift(defaultPreset);
          needsSave = true;
        }

        if (needsSave) presets = await dbService.getAllPresets();

        set((state) => {
            state.presets = presets;
            if (!state.activePresetName) {
                state.activePresetName = defaultPreset.name;
            }
            state.error = '';
        });
      } catch (err) {
        set((state) => { state.error = err instanceof Error ? err.message : 'Error loading presets'; });
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },

    addPreset: async (file: File) => {
      set((state) => { state.error = ''; });
      try {
        const loadedPreset = await parsePresetFile(file);
        const { presets } = get();
        
        await dbService.savePreset(loadedPreset);
        const allPresets = await dbService.getAllPresets();
        
        set((state) => {
            state.presets = allPresets;
            state.activePresetName = loadedPreset.name;
        });
      } catch (err) {
        set((state) => { state.error = err instanceof Error ? err.message : 'Error importing preset'; });
      }
    },

    deleteActivePreset: async () => {
        const { activePresetName } = get();
        if (!activePresetName) return;

        try {
            await dbService.deletePreset(activePresetName);
            set((state) => {
                state.presets = state.presets.filter(p => p.name !== activePresetName);
                state.activePresetName = state.presets.length > 0 ? state.presets[0].name : null;
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to delete preset'; });
        }
    },

    updateActivePreset: async (preset: SillyTavernPreset) => {
        try {
            await dbService.savePreset(preset);
            set((state) => {
                const idx = state.presets.findIndex(p => p.name === preset.name);
                if (idx !== -1) state.presets[idx] = preset;
            });
        } catch (err) {
            set((state) => { state.error = 'Failed to update preset'; });
        }
    },

    setActivePresetName: (name) => {
        set((state) => { state.activePresetName = name; });
    },

    revertActivePreset: async () => {
        const { activePresetName } = get();
        if (!activePresetName) return;
        
        try {
            // Revert logic for hardcoded presets
            if (activePresetName === defaultPreset.name) {
                await dbService.savePreset(defaultPreset);
                get().updateActivePreset(defaultPreset);
                return;
            }
            
            // For others, reload from DB to undo unsaved changes in store (if any)
            const all = await dbService.getAllPresets();
            const original = all.find(p => p.name === activePresetName);
            if (original) {
                set((state) => {
                    const idx = state.presets.findIndex(p => p.name === activePresetName);
                    if (idx !== -1) state.presets[idx] = original;
                });
            }
        } catch (e) {}
    },

    duplicatePreset: async (originalName: string, newName: string) => {
        set((state) => { state.error = ''; });
        const { presets } = get();
        const original = presets.find(p => p.name === originalName);
        
        if (!original) {
            set((state) => { state.error = 'Không tìm thấy Preset gốc.'; });
            return;
        }

        if (presets.some(p => p.name === newName)) {
             throw new Error('Tên Preset đã tồn tại.');
        }

        try {
            const newPreset = JSON.parse(JSON.stringify(original));
            newPreset.name = newName;
            newPreset.comment = `Bản sao của ${originalName}. ${newPreset.comment || ''}`;

            await dbService.savePreset(newPreset);
            
            set((state) => {
                state.presets.push(newPreset);
                state.activePresetName = newName;
            });
        } catch (err) {
            set((state) => { state.error = 'Lỗi khi nhân bản Preset.'; });
            throw err;
        }
    },

    createPreset: async (name: string) => {
        set((state) => { state.error = ''; });
        const { presets } = get();

        if (presets.some(p => p.name === name)) {
             throw new Error('Tên Preset đã tồn tại.');
        }

        try {
            const newPreset = JSON.parse(JSON.stringify(defaultPreset));
            newPreset.name = name;
            newPreset.comment = "Preset mới được tạo.";
            // Empty the prompts array for a clean start
            newPreset.prompts = [];
            
            await dbService.savePreset(newPreset);
            
            set((state) => {
                state.presets.push(newPreset);
                state.activePresetName = name;
            });
        } catch (err) {
             set((state) => { state.error = 'Lỗi khi tạo Preset.'; });
             throw err;
        }
    },

    renamePreset: async (oldName: string, newName: string) => {
        set((state) => { state.error = ''; });
        const { presets } = get();
        const original = presets.find(p => p.name === oldName);

        if (!original) {
             set((state) => { state.error = 'Không tìm thấy Preset gốc.'; });
             return;
        }
        
        if (oldName === newName) return;

        if (presets.some(p => p.name === newName)) {
             throw new Error('Tên Preset mới đã tồn tại.');
        }

        try {
            // 1. Create new entry
            const newPreset = { ...original, name: newName };
            await dbService.savePreset(newPreset);

            // 2. Delete old entry (IndexedDB key is name)
            await dbService.deletePreset(oldName);

            set((state) => {
                // Remove old, add new
                state.presets = state.presets.filter(p => p.name !== oldName);
                state.presets.push(newPreset);
                // Update active if we renamed the active one
                if (state.activePresetName === oldName) {
                    state.activePresetName = newName;
                }
            });
        } catch (err) {
            set((state) => { state.error = 'Lỗi khi đổi tên Preset.'; });
            throw err;
        }
    }
  }))
);
