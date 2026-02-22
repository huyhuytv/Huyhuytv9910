
import type { AdventureSnapshot, ChatSession, CharacterCard, SillyTavernPreset, UserPersona, FullSystemBackup, BackupCharacter } from '../types';
import * as dbService from './dbService';
import { characterToStorable } from './dbService';
import { getAllLocalStorageData, restoreLocalStorageData } from './settingsService';

/**
 * Helper: Convert ArrayBuffer to Base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Creates an "Adventure Snapshot" (Game Save) containing all necessary data to resume a session exactly as is.
 */
export const createSnapshot = (
    session: ChatSession,
    character: CharacterCard,
    preset: SillyTavernPreset,
    persona: UserPersona | null
): void => {
    const snapshot: AdventureSnapshot = {
        version: 1,
        timestamp: Date.now(),
        meta: {
            exportedBy: 'AI Studio Card Tool',
            description: `Bản ghi phiêu lưu: ${character.name} - ${new Date().toLocaleString()}`
        },
        data: {
            character: character,
            characterFileName: session.characterFileName, // Keep original filename ref
            preset: preset,
            session: session,
            userPersona: persona
        }
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Format: Adventure_CharacterName_SessionID.json
    const safeCharName = character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `Adventure_${safeCharName}_${session.sessionId.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Imports an Adventure Snapshot JSON file and restores all data to IndexedDB.
 */
export const importSnapshot = async (file: File): Promise<string> => {
    try {
        const text = await file.text();
        const snapshot = JSON.parse(text) as AdventureSnapshot;

        // Basic Validation
        if (!snapshot.data || !snapshot.data.session || !snapshot.data.character) {
            throw new Error("File không hợp lệ: Thiếu dữ liệu phiên hoặc nhân vật.");
        }

        const { character, characterFileName, preset, session, userPersona } = snapshot.data;

        // 1. Restore Character (Overwrite or Add)
        const charStorable = await characterToStorable({
            card: character,
            fileName: characterFileName,
            avatarUrl: null, 
            avatarFile: null 
        });
        await dbService.saveCharacter(charStorable);

        // 2. Restore Preset
        if (preset) {
            await dbService.savePreset(preset);
        }

        // 3. Restore Persona
        if (userPersona) {
            await dbService.saveUserPersona(userPersona);
        }

        // 4. Restore Session
        session.characterFileName = characterFileName; 
        session.lastUpdated = Date.now();
        
        await dbService.saveChatSession(session);

        return session.sessionId;

    } catch (e) {
        console.error("Import failed", e);
        throw new Error(`Lỗi khi nhập bản ghi: ${e instanceof Error ? e.message : String(e)}`);
    }
};

/**
 * FULL SYSTEM BACKUP: Creates a massive JSON containing EVERYTHING.
 */
export const createFullSystemBackup = async (): Promise<File> => {
    try {
        // 1. Fetch all data from IndexedDB
        const storedCharacters = await dbService.getAllCharacters();
        const storedPresets = await dbService.getAllPresets();
        const storedLorebooks = await dbService.getAllLorebooks();
        const storedPersonas = await dbService.getAllUserPersonas();
        const storedSessions = await dbService.getAllChatSessions();
        const appSettings = getAllLocalStorageData();

        // 2. Process Characters (Convert ArrayBuffer avatars to Base64)
        const backupCharacters: BackupCharacter[] = storedCharacters.map(c => ({
            card: c.card,
            fileName: c.fileName,
            avatarBase64: c.avatar ? arrayBufferToBase64(c.avatar.buffer) : undefined,
            avatarType: c.avatar?.type
        }));

        // 3. Construct Backup Object
        const fullBackup: FullSystemBackup = {
            version: 1,
            timestamp: Date.now(),
            dataType: 'full_system_backup',
            meta: {
                exportedBy: 'AI Studio Card Tool',
                description: `Full System Backup - ${new Date().toLocaleString()}`
            },
            data: {
                characters: backupCharacters,
                presets: storedPresets,
                lorebooks: storedLorebooks,
                personas: storedPersonas,
                chatSessions: storedSessions,
                appSettings: appSettings
            }
        };

        const jsonString = JSON.stringify(fullBackup, null, 2);
        const fileName = `FullBackup_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`;
        
        return new File([jsonString], fileName, { type: 'application/json' });

    } catch (e) {
        console.error("Full Backup Failed:", e);
        throw new Error(`Lỗi sao lưu toàn bộ: ${e instanceof Error ? e.message : String(e)}`);
    }
};

/**
 * FULL SYSTEM RESTORE: Wipes/Overwrites data from a backup file.
 */
export const restoreFullSystemBackup = async (file: File): Promise<void> => {
    try {
        const text = await file.text();
        const backup = JSON.parse(text) as FullSystemBackup;

        if (backup.dataType !== 'full_system_backup' || !backup.data) {
            throw new Error("File không phải là định dạng Sao lưu Hệ thống hợp lệ.");
        }

        const { characters, presets, lorebooks, personas, chatSessions, appSettings } = backup.data;

        // 1. Restore Characters
        for (const c of characters) {
            await dbService.saveCharacter({
                card: c.card,
                fileName: c.fileName,
                avatar: c.avatarBase64 ? {
                    buffer: base64ToArrayBuffer(c.avatarBase64),
                    name: c.fileName.replace('.json', '.png'), // Approximation
                    type: c.avatarType || 'image/png'
                } : undefined
            });
        }

        // 2. Restore Presets
        for (const p of presets) {
            await dbService.savePreset(p);
        }

        // 3. Restore Lorebooks
        for (const l of lorebooks) {
            await dbService.saveLorebook(l);
        }

        // 4. Restore Personas
        for (const p of personas) {
            await dbService.saveUserPersona(p);
        }

        // 5. Restore Chat Sessions
        for (const s of chatSessions) {
            await dbService.saveChatSession(s);
        }

        // 6. Restore App Settings (LocalStorage)
        if (appSettings) {
            restoreLocalStorageData(appSettings);
        }

    } catch (e) {
        console.error("Full Restore Failed:", e);
        throw new Error(`Lỗi khôi phục toàn bộ: ${e instanceof Error ? e.message : String(e)}`);
    }
};
