import type { CharacterCard, TavernHelperScript } from '../types';
import { normalizeCharacterBook } from './lorebookParser';

interface ParseResult {
  card: CharacterCard;
  avatarUrl: string | null;
}

const base64Decode = (str: string): string => {
  try {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (e) {
    console.error('Failed to decode base64 string:', e);
    throw new Error('Dữ liệu base64 trong tệp PNG không hợp lệ hoặc xảy ra lỗi mã hóa ký tự.');
  }
};

/**
 * A helper function to yield control back to the main thread,
 * allowing the UI to remain responsive during heavy processing.
 */
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Extracts character data from a PNG file's tEXt chunk.
 * This version is asynchronous and yields to the main thread periodically
 * to prevent the UI from freezing when processing large files.
 * @param buffer The ArrayBuffer of the PNG file.
 * @returns A promise that resolves to the JSON string of the character data.
 */
const extractPngData = async (buffer: ArrayBuffer): Promise<string> => {
    const view = new DataView(buffer);
    if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
        throw new Error('Đây không phải là một tệp PNG hợp lệ.');
    }

    let offset = 8;
    const CHUNKS_PER_YIELD = 100;
    let chunkCountSinceYield = 0;

    while (offset < view.byteLength) {
        if (chunkCountSinceYield++ >= CHUNKS_PER_YIELD) {
            await yieldToMain();
            chunkCountSinceYield = 0;
        }

        if (offset + 12 > view.byteLength) {
             throw new Error('Phát hiện dữ liệu PNG không hợp lệ gần cuối tệp.');
        }

        const length = view.getUint32(offset);
        const type = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5), view.getUint8(offset + 6), view.getUint8(offset + 7));

        if (offset + 12 + length > view.byteLength) {
            throw new Error('Phát hiện chunk PNG vượt quá giới hạn tệp.');
        }

        if (type === 'tEXt') {
            const chunkData = new Uint8Array(buffer, offset + 8, length);
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(chunkData);

            if (text.startsWith('chara\0')) {
                const base64Data = text.substring(6);
                return base64Decode(base64Data);
            }
        }

        if (type === 'IEND') {
            break;
        }

        const nextOffset = offset + 12 + length;
        if (nextOffset <= offset) {
            throw new Error('Phát hiện chunk PNG không hợp lệ hoặc bị hỏng (độ dài không dương).');
        }
        offset = nextOffset;
    }

    throw new Error('Không tìm thấy dữ liệu nhân vật trong tệp PNG.');
};


/**
 * Recursively flattens the nested 'data' objects found in some V3 cards.
 * @param cardObject The raw card object.
 * @returns A new object with all nested 'data' properties merged into the top level.
 */
const flattenCardData = (cardObject: any): any => {
    let flattened = { ...cardObject };
    while (flattened.data && typeof flattened.data === 'object') {
        const nestedData = flattened.data;
        delete flattened.data;
        // Properties from the nested 'data' object will overwrite existing ones.
        flattened = { ...flattened, ...nestedData };
    }
    return flattened;
};


/**
 * Processes a raw parsed JSON object from a card file and converts it
 * into the standardized CharacterCard format used by the application.
 * This handles different card specs (e.g., V2, V3), deeply nested 'data' objects,
 * and consolidates scripts from multiple formats.
 * @param rawCard The raw object parsed from JSON.
 * @returns A processed CharacterCard object.
 */
export const processRawCard = (rawCard: any): CharacterCard => {
  // Recursively flatten nested 'data' objects first.
  const finalCard: CharacterCard = flattenCardData(rawCard);

  // Consolidate scripts from 'tavern_helper' and 'TavernHelper_scripts'
  const consolidatedScripts = new Map<string, TavernHelperScript>();

  // 1. Process standard 'TavernHelper_scripts' format
  if (finalCard.extensions?.TavernHelper_scripts && Array.isArray(finalCard.extensions.TavernHelper_scripts)) {
      for (const script of finalCard.extensions.TavernHelper_scripts) {
          if (script.type === 'script' && script.value?.id) {
              consolidatedScripts.set(script.value.id, script);
          }
      }
  }

  // 2. Process non-standard 'tavern_helper' format
  if (finalCard.extensions?.tavern_helper && Array.isArray(finalCard.extensions.tavern_helper)) {
      for (const section of finalCard.extensions.tavern_helper) {
          if (Array.isArray(section) && section[0] === 'scripts' && Array.isArray(section[1])) {
              const scriptsArray = section[1];
              for (const scriptValue of scriptsArray) {
                  // This format seems to be just the `value` part of the standard format
                  if (scriptValue && scriptValue.id && scriptValue.type === 'script') {
                      if (!consolidatedScripts.has(scriptValue.id)) {
                          // Re-wrap it into the standard TavernHelperScript format
                          const tavernScript: TavernHelperScript = {
                              type: 'script',
                              value: {
                                  id: scriptValue.id,
                                  name: scriptValue.name,
                                  content: scriptValue.content,
                                  enabled: scriptValue.enabled,
                                  info: scriptValue.info,
                                  buttons: scriptValue.button?.buttons || [],
                                  data: scriptValue.data || {},
                              }
                          };
                          consolidatedScripts.set(scriptValue.id, tavernScript);
                      }
                  }
              }
          }
      }
  }
  
  // 3. Update the extensions object with the consolidated list
  if (consolidatedScripts.size > 0) {
      if (!finalCard.extensions) {
          finalCard.extensions = {};
      }
      finalCard.extensions.TavernHelper_scripts = Array.from(consolidatedScripts.values());
  }

  // 4. Clean up old/non-standard formats to avoid confusion
  if (finalCard.extensions) {
      delete finalCard.extensions.tavern_helper;
  }

  // Standardize world info book: V3 uses 'character_book', older versions might use 'char_book'.
  // We'll use 'char_book' internally for consistency.
  if (finalCard.character_book) {
      finalCard.char_book = normalizeCharacterBook(finalCard.character_book) || undefined;
      delete (finalCard as any).character_book;
  } else if (finalCard.char_book) {
      finalCard.char_book = normalizeCharacterBook(finalCard.char_book) || undefined;
  }

  // Ensure all WI entries have a UID for state management
  if (finalCard.char_book && finalCard.char_book.entries) {
      finalCard.char_book.entries.forEach(entry => {
          if (!entry.uid) {
              entry.uid = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
      });
  }

  // Ensure 'personality' exists at the top level, pulling from 'char_persona' if needed.
  if (!finalCard.personality && finalCard.char_persona) {
      finalCard.personality = finalCard.char_persona;
  }
  
  return finalCard;
};


export const parseCharacterFile = async (file: File): Promise<ParseResult> => {
  let rawCardData: any;
  let avatarUrl: string | null = null;

  // Use case-insensitive extension check and prioritize extension over MIME type
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const text = await file.text();
    rawCardData = JSON.parse(text);
  } else if (fileName.endsWith('.png')) {
      const buffer = await file.arrayBuffer();
      const jsonData = await extractPngData(buffer);
      rawCardData = JSON.parse(jsonData);
      // Create a URL for the image preview since it's a PNG.
      avatarUrl = URL.createObjectURL(file);
  } else {
    throw new Error('Loại tệp không được hỗ trợ. Vui lòng tải lên tệp .json hoặc .png.');
  }

  // Process the raw data to handle different card formats (e.g., V2 vs V3).
  const card = processRawCard(rawCardData);
  return { card, avatarUrl };
};