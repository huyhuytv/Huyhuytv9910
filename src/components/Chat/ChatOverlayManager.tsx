
import React, { ForwardedRef, forwardRef } from 'react';
import { ChatModals } from './ChatModals';
import { AssistantPanel } from './AssistantPanel';
import { GameHUD } from './GameHUD';
import { RpgDashboard } from './RpgDashboard';
import { FloatingStatusHUD } from './FloatingStatusHUD';
import { ErrorResolutionModal } from '../ErrorResolutionModal';
import type { ChatMessage, CharacterCard, ChatTurnLog, SystemLogEntry, ScriptButton, QuickReply, InteractiveErrorState, TavernHelperScript, WorldInfoEntry } from '../../types';

interface ChatOverlayManagerProps {
    // UI States
    uiState: {
        isAuthorNoteOpen: boolean;
        setIsAuthorNoteOpen: (v: boolean) => void;
        isWorldInfoOpen: boolean;
        setIsWorldInfoOpen: (v: boolean) => void;
        isLorebookCreatorOpen: boolean;
        setIsLorebookCreatorOpen: (v: boolean) => void;
        lorebookKeyword: string;
        setLorebookKeyword: (v: string) => void;
        isAssistantOpen: boolean;
        setIsAssistantOpen: (v: boolean) => void;
        isHUDOpen: boolean;
        setIsHUDOpen: (v: boolean) => void;
        isRpgDashboardOpen: boolean;
        setIsRpgDashboardOpen: (v: boolean) => void;
        isStatusHUDOpen: boolean;
        setIsStatusHUDOpen: (v: boolean) => void;
    };

    // Data
    data: {
        card: CharacterCard;
        messages: ChatMessage[];
        longTermSummaries: string[];
        lorebooks: any[];
        authorNote: string;
        worldInfoState: any;
        worldInfoPinned: any;
        worldInfoPlacement: any;
        variables: any;
        logs: {
            turns: ChatTurnLog[];
            systemLog: SystemLogEntry[];
            smartScanLog: string[];
            worldInfoLog: string[];
        };
        lastInteractiveMsg: ChatMessage | undefined;
        characterAvatarUrl: string | null;
        userPersonaName: string;
        sessionId: string;
        extensionSettings: any;
        interactiveError: InteractiveErrorState;
        generatedLorebookEntries?: WorldInfoEntry[]; // NEW: Generated Entries
    };

    // Actions
    actions: {
        updateAuthorNote: (note: string) => void;
        updateWorldInfoState: (state: any) => void;
        updateWorldInfoPinned: (state: any) => void;
        updateWorldInfoPlacement: (state: any) => void;
        handleUpdateVariable: (key: string, value: any) => void;
        handleRewriteLastTurn: (id: string, content: string) => void;
        handleUserDecision: (decision: 'retry' | 'ignore') => void;
    };
}

export const ChatOverlayManager = forwardRef((
    { uiState, data, actions }: ChatOverlayManagerProps, 
    ref: ForwardedRef<HTMLIFrameElement> // Ref for FloatingHUD Iframe
) => {
    
    // Combine card entries + generated entries for management modal
    const combinedEntries = [
        ...(data.card.char_book?.entries || []),
        ...(data.generatedLorebookEntries || [])
    ];

    return (
        <>
            <ChatModals 
                isAuthorNoteOpen={uiState.isAuthorNoteOpen}
                setIsAuthorNoteOpen={uiState.setIsAuthorNoteOpen}
                authorNote={data.authorNote}
                updateAuthorNote={actions.updateAuthorNote}
                isWorldInfoOpen={uiState.isWorldInfoOpen}
                setIsWorldInfoOpen={uiState.setIsWorldInfoOpen}
                worldInfoEntries={combinedEntries}
                worldInfoState={data.worldInfoState}
                worldInfoPinned={data.worldInfoPinned}
                worldInfoPlacement={data.worldInfoPlacement}
                updateWorldInfoState={actions.updateWorldInfoState}
                updateWorldInfoPinned={actions.updateWorldInfoPinned}
                updateWorldInfoPlacement={actions.updateWorldInfoPlacement}
                isLorebookCreatorOpen={uiState.isLorebookCreatorOpen}
                setIsLorebookCreatorOpen={uiState.setIsLorebookCreatorOpen}
                lorebookKeyword={uiState.lorebookKeyword}
                setLorebookKeyword={uiState.setLorebookKeyword}
                messages={data.messages}
                longTermSummaries={data.longTermSummaries}
                lorebooks={data.lorebooks}
            />

            <AssistantPanel 
                isOpen={uiState.isAssistantOpen}
                onClose={() => uiState.setIsAssistantOpen(false)}
                gameHistory={data.messages}
                card={data.card}
                variables={data.variables}
                logs={data.logs}
                onUpdateVariable={actions.handleUpdateVariable}
                onRewriteMessage={actions.handleRewriteLastTurn}
            />

            <GameHUD 
                variables={data.variables}
                isOpen={uiState.isHUDOpen}
                onClose={() => uiState.setIsHUDOpen(false)}
            />

            <RpgDashboard 
                data={data.card.rpg_data}
                isOpen={uiState.isRpgDashboardOpen}
                onClose={() => uiState.setIsRpgDashboardOpen(false)}
            />

            <FloatingStatusHUD 
                ref={ref}
                isOpen={uiState.isStatusHUDOpen}
                onClose={() => uiState.setIsStatusHUDOpen(false)}
                htmlContent={data.lastInteractiveMsg?.interactiveHtml || ''}
                scripts={data.card.extensions?.TavernHelper_scripts || []}
                originalRawContent={data.lastInteractiveMsg?.originalRawContent || ''}
                variables={data.variables}
                extensionSettings={data.extensionSettings}
                characterName={data.card.name}
                userPersonaName={data.userPersonaName}
                characterId={data.sessionId}
                sessionId={data.sessionId}
                characterAvatarUrl={data.characterAvatarUrl}
            />

            <ErrorResolutionModal 
                errorState={data.interactiveError}
                onRetry={() => actions.handleUserDecision('retry')}
                onIgnore={() => actions.handleUserDecision('ignore')}
            />
        </>
    );
});
