
import { useState, useCallback, useEffect } from 'react';
import type { CharacterCard, WorldInfoEntry, RegexScript, TavernHelperScript } from '../types';
import { useLorebook } from '../contexts/LorebookContext';

export const useCharacterEditor = (card: CharacterCard, onUpdate: (card: CharacterCard) => void) => {
    const { lorebooks } = useLorebook();
    
    // Logic quản lý các trường chung
    const handleChange = useCallback((field: keyof CharacterCard, value: any) => {
        onUpdate({ ...card, [field]: value });
    }, [card, onUpdate]);

    // Logic quản lý Lorebook (Character Book)
    const handleImportLorebook = useCallback((selectedLorebookName: string) => {
        if (!selectedLorebookName) return;
        const lorebookToImport = lorebooks.find(lb => lb.name === selectedLorebookName);
        if (!lorebookToImport || !lorebookToImport.book) return;

        const sourceEntries = lorebookToImport.book.entries || [];
        if (sourceEntries.length === 0) {
            alert('Sổ tay này không có mục nào để nhập.');
            return;
        }

        const newEntries = JSON.parse(JSON.stringify(sourceEntries)) as WorldInfoEntry[];
        newEntries.forEach(entry => {
            entry.source_lorebook = lorebookToImport.name;
            entry.uid = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            if (entry.enabled === undefined) entry.enabled = true;
        });

        const currentEntries = card.char_book?.entries || [];
        const combinedEntries = [...currentEntries, ...newEntries];

        onUpdate({ 
            ...card,
            char_book: {
                ...(card.char_book || { entries: [] }),
                entries: combinedEntries,
            }
        });
        
        alert(`Đã nhập thành công ${sourceEntries.length} mục!`);
    }, [card, onUpdate, lorebooks]);

    // Logic quản lý Extensions
    const handleExtensionsUpdate = useCallback((key: string, data: any) => {
        const newExtensions = { ...(card.extensions || {}) };
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
            newExtensions[key] = data;
        } else {
            delete newExtensions[key];
        }
        onUpdate({ ...card, extensions: newExtensions });
    }, [card, onUpdate]);

    const handleRegexScriptsUpdate = useCallback((updatedScripts: RegexScript[]) => {
        handleExtensionsUpdate('regex_scripts', updatedScripts);
    }, [handleExtensionsUpdate]);

    const handleTavernScriptsUpdate = useCallback((updatedScripts: TavernHelperScript[]) => {
        handleExtensionsUpdate('TavernHelper_scripts', updatedScripts);
    }, [handleExtensionsUpdate]);

    return {
        handleChange,
        handleImportLorebook,
        handleRegexScriptsUpdate,
        handleTavernScriptsUpdate,
        availableLorebooks: lorebooks,
    };
};
