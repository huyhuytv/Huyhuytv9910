
import type { Lorebook, CharacterBook, WorldInfoEntry } from '../types';

/**
 * Normalizes a character book object.
 * It ensures the 'entries' field is an array and sanitizes each entry.
 * It will NEVER return null, it always returns at least an empty book structure.
 */
export const normalizeCharacterBook = (book: any): CharacterBook => {
    const cleanBook: CharacterBook = {
        entries: [],
        name: book?.name || undefined,
        ...book // Preserve other random properties
    };

    let entriesArray: any[] = [];

    // Attempt to find entries
    if (book && Array.isArray(book.entries)) {
        entriesArray = book.entries;
    } else if (book && typeof book.entries === 'object' && book.entries !== null) {
        // Handle object-based lists (index-keyed)
        entriesArray = Object.values(book.entries);
    }

    // Process and sanitize entries
    cleanBook.entries = entriesArray.map((entry) => {
        // If entry is not an object, create a wrapper
        if (typeof entry !== 'object' || entry === null) {
            return {
                keys: [],
                content: String(entry || ''),
                enabled: true
            };
        }

        const newEntry: WorldInfoEntry = { ...entry };

        // 1. Sanitize Keys
        if (!Array.isArray(newEntry.keys)) {
            // Check legacy 'key' field
            const entryAny = newEntry as any;
            if (entryAny.key) {
                newEntry.keys = Array.isArray(entryAny.key) 
                    ? entryAny.key 
                    : [String(entryAny.key)];
                delete entryAny.key;
            } else {
                newEntry.keys = [];
            }
        }
        // Ensure all keys are strings
        newEntry.keys = newEntry.keys.map(k => String(k));

        // 2. Sanitize Content
        if (newEntry.content === undefined || newEntry.content === null) {
            newEntry.content = '';
        } else {
            newEntry.content = String(newEntry.content);
        }

        // 3. Defaults
        if (newEntry.enabled === undefined) newEntry.enabled = true;
        if (!newEntry.uid) {
             // Generate temporary UID if missing (crucial for React keys)
             newEntry.uid = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        // 4. Sanitize Position (Fix for crash)
        // V3 cards may use numbers for position (e.g., 4). React components expect string | undefined.
        if (newEntry.position !== undefined && newEntry.position !== null) {
            newEntry.position = String(newEntry.position);
        }

        return newEntry;
    });

    return cleanBook;
};


/**
 * Parses a SillyTavern-compatible lorebook file (.json).
 * "Forgiving Mode": Tries to extract data from anything that looks like JSON.
 */
export const parseLorebookFile = async (file: File): Promise<Lorebook> => {
    // Relaxed file type check (just warn in console, but try to parse anyway if text)
    if (!file.name.toLowerCase().endsWith('.json')) {
        console.warn('Lorebook parser: File does not end with .json, attempting to parse anyway.');
    }

    try {
        const text = await file.text();
        let rawData: any;
        
        try {
            rawData = JSON.parse(text);
        } catch (e) {
            throw new Error('Tệp không phải là JSON hợp lệ.');
        }

        let bookToNormalize: any = rawData;

        // Recursive search for "entries" or standard book keys if rawData is a wrapper
        if (typeof rawData === 'object' && rawData !== null) {
            if (Array.isArray(rawData.entries) || typeof rawData.entries === 'object') {
                bookToNormalize = rawData;
            } else if (rawData.char_book) {
                bookToNormalize = rawData.char_book;
            } else if (rawData.character_book) {
                bookToNormalize = rawData.character_book;
            } else if (rawData.data && (rawData.data.character_book || rawData.data.entries)) {
                 // V3 card structure deep dive
                 bookToNormalize = rawData.data.character_book || rawData.data;
            }
        }
        
        const finalBook = normalizeCharacterBook(bookToNormalize);

        return {
            name: file.name,
            book: finalBook
        };

    } catch (error) {
        // In the spirit of "Don't break", if everything fails, return an empty valid lorebook
        // so the user can at least start editing.
        console.error("Lorebook parsing failed, returning empty book:", error);
        return {
            name: file.name,
            book: { entries: [] }
        };
    }
};
