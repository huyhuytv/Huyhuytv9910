
import React, { createContext, useEffect } from 'react';
import type { Lorebook } from '../types';
import { useLorebookStore } from '../store/lorebookStore';

interface LorebookContextType {
  lorebooks: Lorebook[];
  error: string;
  isLoading: boolean;
  loadLorebooks: (files: FileList) => Promise<void>;
  addLorebook: (lorebook: Lorebook) => Promise<void>;
  updateLorebook: (lorebook: Lorebook) => Promise<void>;
  deleteLorebook: (name: string) => Promise<void>;
  reloadLorebooks: () => Promise<void>;
  dispatch: any;
}

export const LorebookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useLorebookStore();
  useEffect(() => {
    store.reloadLorebooks();
  }, []);
  return <>{children}</>;
};

export const useLorebook = (): LorebookContextType => {
  const store = useLorebookStore();
  return {
    lorebooks: store.lorebooks,
    error: store.error,
    isLoading: store.isLoading,
    loadLorebooks: store.loadLorebooks,
    addLorebook: store.addLorebook,
    updateLorebook: store.updateLorebook,
    deleteLorebook: store.deleteLorebook,
    reloadLorebooks: store.reloadLorebooks,
    dispatch: () => {},
  };
};
