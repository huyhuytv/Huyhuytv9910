
import React, { createContext, useEffect } from 'react';
import type { SillyTavernPreset } from '../types';
import { usePresetStore } from '../store/presetStore';

interface PresetContextType {
  presets: SillyTavernPreset[];
  activePresetName: string | null;
  error: string;
  isLoading: boolean;
  addPreset: (file: File) => Promise<void>;
  deleteActivePreset: () => Promise<void>;
  updateActivePreset: (preset: SillyTavernPreset) => Promise<void>;
  setActivePresetName: (name: string | null) => void;
  revertActivePreset: () => Promise<void>;
  duplicatePreset: (originalName: string, newName: string) => Promise<void>;
  createPreset: (name: string) => Promise<void>;
  renamePreset: (oldName: string, newName: string) => Promise<void>;
  reloadPresets: () => Promise<void>;
  dispatch: any;
}

export const PresetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = usePresetStore();
  useEffect(() => {
    store.reloadPresets();
  }, []);
  return <>{children}</>;
};

export const usePreset = (): PresetContextType => {
  const store = usePresetStore();
  return {
    presets: store.presets,
    activePresetName: store.activePresetName,
    error: store.error,
    isLoading: store.isLoading,
    addPreset: store.addPreset,
    deleteActivePreset: store.deleteActivePreset,
    updateActivePreset: store.updateActivePreset,
    setActivePresetName: store.setActivePresetName,
    revertActivePreset: store.revertActivePreset,
    duplicatePreset: store.duplicatePreset,
    createPreset: store.createPreset,
    renamePreset: store.renamePreset,
    reloadPresets: store.reloadPresets,
    dispatch: () => {},
  };
};
