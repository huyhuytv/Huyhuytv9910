
import type { CharacterCard, Lorebook, SillyTavernPreset, ChatSession, UserPersona, CharacterInContext } from '../types';

const DB_NAME = 'SillyTavernCardStudioDB';
const DB_VERSION = 6; // Tăng phiên bản để kích hoạt onupgradeneeded
const LOREBOOK_STORE = 'lorebooks';
const CHARACTER_STORE = 'characters';
const PRESET_STORE = 'presets';
const CHAT_SESSION_STORE = 'chatSessions';
const USER_PERSONA_STORE = 'userPersonas'; // Store mới

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject("Lỗi khi mở IndexedDB.");
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(LOREBOOK_STORE)) {
                    db.createObjectStore(LOREBOOK_STORE, { keyPath: 'name' });
                }
                if (db.objectStoreNames.contains('character_session')) {
                    db.deleteObjectStore('character_session');
                }
                if (!db.objectStoreNames.contains(CHARACTER_STORE)) {
                    db.createObjectStore(CHARACTER_STORE, { keyPath: 'fileName' });
                }
                if (db.objectStoreNames.contains('preset_session')) {
                    db.deleteObjectStore('preset_session');
                }
                if (!db.objectStoreNames.contains(PRESET_STORE)) {
                    db.createObjectStore(PRESET_STORE, { keyPath: 'name' });
                }
                if (!db.objectStoreNames.contains(CHAT_SESSION_STORE)) {
                    db.createObjectStore(CHAT_SESSION_STORE, { keyPath: 'sessionId' });
                }
                if (!db.objectStoreNames.contains(USER_PERSONA_STORE)) {
                    db.createObjectStore(USER_PERSONA_STORE, { keyPath: 'id' });
                }
            };
        });
    }
    return dbPromise;
};

// --- Chat Session Service ---

export const getAllChatSessions = async (): Promise<ChatSession[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHAT_SESSION_STORE, 'readonly');
        const store = transaction.objectStore(CHAT_SESSION_STORE);
        const request = store.getAll();

        request.onerror = () => reject("Không thể lấy các phiên trò chuyện từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as ChatSession[]);
    });
};

export const getChatSession = async (sessionId: string): Promise<ChatSession | undefined> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHAT_SESSION_STORE, 'readonly');
        const store = transaction.objectStore(CHAT_SESSION_STORE);
        const request = store.get(sessionId);

        request.onerror = () => reject("Không thể lấy phiên trò chuyện từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as ChatSession | undefined);
    });
};

export const saveChatSession = async (session: ChatSession): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHAT_SESSION_STORE, 'readwrite');
        const store = transaction.objectStore(CHAT_SESSION_STORE);
        const request = store.put(session);

        request.onerror = () => reject(`Không thể lưu phiên trò chuyện "${session.sessionId}".`);
        request.onsuccess = () => resolve();
    });
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHAT_SESSION_STORE, 'readwrite');
        const store = transaction.objectStore(CHAT_SESSION_STORE);
        const request = store.delete(sessionId);

        request.onerror = () => reject(`Không thể xóa phiên trò chuyện "${sessionId}".`);
        request.onsuccess = () => resolve();
    });
};


// --- Lorebook Service ---

export const getAllLorebooks = async (): Promise<Lorebook[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOREBOOK_STORE, 'readonly');
        const store = transaction.objectStore(LOREBOOK_STORE);
        const request = store.getAll();

        request.onerror = () => reject("Không thể lấy Sổ tay Thế giới từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as Lorebook[]);
    });
};

export const saveLorebook = async (lorebook: Lorebook): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOREBOOK_STORE, 'readwrite');
        const store = transaction.objectStore(LOREBOOK_STORE);
        const request = store.put(lorebook);

        request.onerror = () => reject(`Không thể lưu Sổ tay Thế giới "${lorebook.name}".`);
        request.onsuccess = () => resolve();
    });
};

export const deleteLorebook = async (name: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(LOREBOOK_STORE, 'readwrite');
        const store = transaction.objectStore(LOREBOOK_STORE);
        const request = store.delete(name);

        request.onerror = () => reject(`Không thể xóa Sổ tay Thế giới "${name}".`);
        request.onsuccess = () => resolve();
    });
};


// --- Character Service ---

export interface StoredCharacter {
  card: CharacterCard;
  fileName: string; // This is the key
  avatar?: {
    buffer: ArrayBuffer;
    name: string;
    type: string;
  };
}

export const characterToStorable = async (character: CharacterInContext): Promise<StoredCharacter> => {
    const storable: StoredCharacter = {
        card: character.card,
        fileName: character.fileName,
    };
    if (character.avatarFile) {
        storable.avatar = {
            buffer: await character.avatarFile.arrayBuffer(),
            name: character.avatarFile.name,
            type: character.avatarFile.type,
        };
    }
    return storable;
};


export const getAllCharacters = async (): Promise<StoredCharacter[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHARACTER_STORE, 'readonly');
        const store = transaction.objectStore(CHARACTER_STORE);
        const request = store.getAll();

        request.onerror = () => reject("Không thể lấy nhân vật từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as StoredCharacter[]);
    });
};

export const saveCharacter = async (character: StoredCharacter): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHARACTER_STORE, 'readwrite');
        const store = transaction.objectStore(CHARACTER_STORE);
        const request = store.put(character);
        request.onerror = () => reject(`Không thể lưu nhân vật "${character.fileName}".`);
        request.onsuccess = () => resolve();
    });
};

export const deleteCharacter = async (fileName: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CHARACTER_STORE, 'readwrite');
        const store = transaction.objectStore(CHARACTER_STORE);
        const request = store.delete(fileName);
        request.onerror = () => reject(`Không thể xóa nhân vật "${fileName}".`);
        request.onsuccess = () => resolve();
    });
};


// --- Preset Service ---

export const getAllPresets = async (): Promise<SillyTavernPreset[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PRESET_STORE, 'readonly');
        const store = transaction.objectStore(PRESET_STORE);
        const request = store.getAll();

        request.onerror = () => reject("Không thể lấy presets từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as SillyTavernPreset[]);
    });
};

export const savePreset = async (preset: SillyTavernPreset): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PRESET_STORE, 'readwrite');
        const store = transaction.objectStore(PRESET_STORE);
        const request = store.put(preset);

        request.onerror = () => reject(`Không thể lưu preset "${preset.name}".`);
        request.onsuccess = () => resolve();
    });
};

export const deletePreset = async (name: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PRESET_STORE, 'readwrite');
        const store = transaction.objectStore(PRESET_STORE);
        const request = store.delete(name);

        request.onerror = () => reject(`Không thể xóa preset "${name}".`);
        request.onsuccess = () => resolve();
    });
};

// --- User Persona Service ---

export const getAllUserPersonas = async (): Promise<UserPersona[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_PERSONA_STORE, 'readonly');
        const store = transaction.objectStore(USER_PERSONA_STORE);
        const request = store.getAll();

        request.onerror = () => reject("Không thể lấy hồ sơ người dùng từ cơ sở dữ liệu.");
        request.onsuccess = () => resolve(request.result as UserPersona[]);
    });
};

export const saveUserPersona = async (persona: UserPersona): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_PERSONA_STORE, 'readwrite');
        const store = transaction.objectStore(USER_PERSONA_STORE);
        const request = store.put(persona);

        request.onerror = () => reject(`Không thể lưu hồ sơ "${persona.name}".`);
        request.onsuccess = () => resolve();
    });
};

export const deleteUserPersona = async (personaId: string): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(USER_PERSONA_STORE, 'readwrite');
        const store = transaction.objectStore(USER_PERSONA_STORE);
        const request = store.delete(personaId);

        request.onerror = () => reject(`Không thể xóa hồ sơ.`);
        request.onsuccess = () => resolve();
    });
};
