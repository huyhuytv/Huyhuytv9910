
// --- SYSTEM I/O (Backup & Restore) ---

import type { CharacterCard, Lorebook, UserPersona } from './character';
import type { SillyTavernPreset } from './settings';
import type { ChatSession } from './chat';

export interface AdventureSnapshot {
    version: number;
    timestamp: number;
    meta: {
        exportedBy: string;
        description: string;
    };
    data: {
        character: CharacterCard;
        characterFileName: string;
        preset: SillyTavernPreset;
        session: ChatSession;
        userPersona: UserPersona | null;
    };
}

export interface BackupCharacter {
    card: CharacterCard;
    fileName: string;
    avatarBase64?: string;
    avatarType?: string;
}

export interface FullSystemBackup {
    version: number;
    timestamp: number;
    dataType: 'full_system_backup';
    meta: {
        exportedBy: string;
        description: string;
    };
    data: {
        characters: BackupCharacter[];
        presets: SillyTavernPreset[];
        lorebooks: Lorebook[];
        personas: UserPersona[];
        chatSessions: ChatSession[];
        appSettings: Record<string, any>;
    };
}
