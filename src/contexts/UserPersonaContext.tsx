
import React, { createContext, useEffect, useMemo } from 'react';
import type { UserPersona } from '../types';
import { usePersonaStore } from '../store/personaStore';

interface UserPersonaContextType {
  personas: UserPersona[];
  activePersonaId: string | null;
  error: string;
  isLoading: boolean;
  addOrUpdatePersona: (persona: UserPersona) => Promise<void>;
  deletePersona: (personaId: string) => Promise<void>;
  setActivePersonaId: (id: string | null) => void;
  activePersona: UserPersona | null;
  reloadPersonas: () => Promise<void>;
  dispatch: any;
}

export const UserPersonaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = usePersonaStore();
  useEffect(() => {
    store.reloadPersonas();
  }, []);
  return <>{children}</>;
};

export const useUserPersona = (): UserPersonaContextType => {
  const store = usePersonaStore();
  
  const activePersona = useMemo(() => {
    return store.personas.find(p => p.id === store.activePersonaId) || null;
  }, [store.personas, store.activePersonaId]);

  return {
    personas: store.personas,
    activePersonaId: store.activePersonaId,
    error: store.error,
    isLoading: store.isLoading,
    addOrUpdatePersona: store.addOrUpdatePersona,
    deletePersona: store.deletePersona,
    setActivePersonaId: store.setActivePersonaId,
    activePersona,
    reloadPersonas: store.reloadPersonas,
    dispatch: () => {},
  };
};
