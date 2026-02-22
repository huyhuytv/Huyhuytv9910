
import { useState, useCallback } from 'react';

export const useChatUI = () => {
    // --- Visibility Toggles ---
    const [isImmersive, setIsImmersive] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [isHUDOpen, setIsHUDOpen] = useState(false);
    const [isStatusHUDOpen, setIsStatusHUDOpen] = useState(false);
    const [isRpgDashboardOpen, setIsRpgDashboardOpen] = useState(false);
    const [isAuthorNoteOpen, setIsAuthorNoteOpen] = useState(false);
    const [isWorldInfoOpen, setIsWorldInfoOpen] = useState(false);
    const [isLorebookCreatorOpen, setIsLorebookCreatorOpen] = useState(false);

    // --- Local UI Inputs ---
    const [lorebookKeyword, setLorebookKeyword] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');

    // --- Handlers ---
    const toggleHUD = useCallback(() => setIsHUDOpen(prev => !prev), []);
    const toggleStatusHUD = useCallback(() => setIsStatusHUDOpen(prev => !prev), []);
    const toggleAssistant = useCallback(() => setIsAssistantOpen(prev => !prev), []);
    const toggleRpgDashboard = useCallback(() => setIsRpgDashboardOpen(prev => !prev), []);
    
    // Message Editing Logic
    const startEditing = useCallback((msg: { id: string, content: string }) => {
        setEditingMessageId(msg.id);
        setEditingContent(msg.content);
    }, []);

    const cancelEditing = useCallback(() => {
        setEditingMessageId(null);
        setEditingContent('');
    }, []);

    return {
        // States
        isImmersive, setIsImmersive,
        isAssistantOpen, setIsAssistantOpen, toggleAssistant,
        isHUDOpen, setIsHUDOpen, toggleHUD,
        isStatusHUDOpen, setIsStatusHUDOpen, toggleStatusHUD,
        isRpgDashboardOpen, setIsRpgDashboardOpen, toggleRpgDashboard,
        isAuthorNoteOpen, setIsAuthorNoteOpen,
        isWorldInfoOpen, setIsWorldInfoOpen,
        isLorebookCreatorOpen, setIsLorebookCreatorOpen,
        lorebookKeyword, setLorebookKeyword,
        editingMessageId, editingContent, setEditingContent,
        
        // Actions
        startEditing,
        cancelEditing
    };
};
