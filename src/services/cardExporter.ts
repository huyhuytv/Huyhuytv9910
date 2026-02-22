import type { CharacterCard } from '../types';

// CRC32 implementation
const crc32Table = (() => {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
})();

const crc32 = (bytes: Uint8Array): number => {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
};

// UTF-8 string to Base64
const utf8ToBase64 = (str: string): string => {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error("Failed to encode to Base64:", e);
        throw new Error("Không thể mã hóa dữ liệu thẻ sang Base64.");
    }
};

const createTextChunk = (keyword: string, data: string): Uint8Array => {
    const encoder = new TextEncoder();
    const keywordBytes = encoder.encode(keyword);
    const nullSeparator = new Uint8Array([0]);
    const dataBytes = encoder.encode(data);

    const chunkData = new Uint8Array(keywordBytes.length + nullSeparator.length + dataBytes.length);
    chunkData.set(keywordBytes, 0);
    chunkData.set(nullSeparator, keywordBytes.length);
    chunkData.set(dataBytes, keywordBytes.length + 1);

    const typeBytes = encoder.encode('tEXt');
    const crcData = new Uint8Array(typeBytes.length + chunkData.length);
    crcData.set(typeBytes, 0);
    crcData.set(chunkData, typeBytes.length);

    const crc = crc32(crcData);

    const chunk = new Uint8Array(12 + chunkData.length);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, chunkData.length);
    chunk.set(typeBytes, 4);
    chunk.set(chunkData, 8);
    view.setUint32(8 + chunkData.length, crc);

    return chunk;
};

export const buildExportObject = (card: CharacterCard): any => {
    // Deep copy to ensure we don't mutate the original object
    const cardToProcess = JSON.parse(JSON.stringify(card));

    // Clean up studio-specific fields before export to maintain compatibility
    delete cardToProcess.attached_lorebooks;
    if (cardToProcess.char_book && cardToProcess.char_book.entries) {
        cardToProcess.char_book.entries = cardToProcess.char_book.entries.map((entry: any) => {
            const { source_lorebook, uid, ...rest } = entry;
            return rest;
        });
    }

    // Reconstruct V3 format if it was a V3 card
    if (cardToProcess.spec === 'chara_card_v3') {
        const data: { [key: string]: any } = {};
        const root: { [key: string]: any } = {
            spec: cardToProcess.spec,
            spec_version: cardToProcess.spec_version,
        };

        const duplicatedFields = ['name', 'description', 'first_mes', 'mes_example'];

        // Populate data object and root object from the cleaned card
        for (const key in cardToProcess) {
            if (key === 'spec' || key === 'spec_version') continue;
            
            const cardKey = key as keyof CharacterCard;

            // Rename char_book back to character_book for export inside data
            if (cardKey === 'char_book' && cardToProcess.char_book) {
                data.character_book = cardToProcess.char_book;
            } else {
                 data[cardKey] = cardToProcess[cardKey];
            }

            if (duplicatedFields.includes(key)) {
                root[key] = cardToProcess[cardKey];
            }
        }
        root.data = data;
        return root;
    } 
    
    // For V2 or other formats, return the cleaned card object
    if (cardToProcess.char_book && cardToProcess.char_book.entries.length === 0) {
        delete cardToProcess.char_book;
    }
    return cardToProcess;
}


export const exportToPng = async (card: CharacterCard, avatarFile: File, fileName: string): Promise<void> => {
    const buffer = await avatarFile.arrayBuffer();
    const originalBytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
        throw new Error('Tệp avatar không phải là một tệp PNG hợp lệ.');
    }

    const chunks: Uint8Array[] = [];
    let offset = 8;
    let iendChunk: Uint8Array | null = null;

    while (offset < buffer.byteLength) {
        const length = view.getUint32(offset);
        const type = String.fromCharCode(...originalBytes.slice(offset + 4, offset + 8));
        const chunk = originalBytes.slice(offset, offset + 12 + length);

        if (type === 'IEND') {
            iendChunk = chunk;
            break;
        }

        if (type === 'tEXt') {
            const decoder = new TextDecoder();
            const chunkData = originalBytes.slice(offset + 8, offset + 8 + length);
            const text = decoder.decode(chunkData);
            if (text.startsWith('chara\0')) {
                // Skip existing character data chunk
                offset += 12 + length;
                continue;
            }
        }
        
        chunks.push(chunk);
        offset += 12 + length;
    }
    
    if (!iendChunk) {
        throw new Error('Tệp PNG bị hỏng hoặc thiếu chunk IEND.');
    }

    const exportObject = buildExportObject(card);
    const cardJson = JSON.stringify(exportObject);
    const base64Card = utf8ToBase64(cardJson);
    const newChunk = createTextChunk('chara', base64Card);

    let totalLength = 8; // PNG signature
    chunks.forEach(c => totalLength += c.length);
    totalLength += newChunk.length;
    totalLength += iendChunk.length;
    
    const newPngBytes = new Uint8Array(totalLength);
    newPngBytes.set(originalBytes.slice(0, 8), 0); // PNG Signature
    
    let currentOffset = 8;
    chunks.forEach(c => {
        newPngBytes.set(c, currentOffset);
        currentOffset += c.length;
    });

    newPngBytes.set(newChunk, currentOffset);
    currentOffset += newChunk.length;

    newPngBytes.set(iendChunk, currentOffset);

    const blob = new Blob([newPngBytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};