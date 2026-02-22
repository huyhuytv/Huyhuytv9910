
import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { CharacterCard, Lorebook, WorldInfoEntry } from '../types';
import { exportToPng, buildExportObject } from '../services/cardExporter';
import { Loader } from './Loader';
import { ExportModal } from './ExportModal';
import { useLorebook } from '../contexts/LorebookContext'; // Import Hook

interface AnalysisPaneProps {
  card: CharacterCard;
  onUpdate: (card: CharacterCard) => void;
  fileName: string;
  avatarUrl: string | null;
  avatarFile: File | null;
  setAvatarUrl: (url: string | null) => void;
  setAvatarFile: (file: File | null) => void;
  
  // New Props for Creation Mode
  isNewCharacter?: boolean;
  onSaveNew?: () => void;
}

const estimateTokens = (text: string = ''): number => {
    if(!text) return 0;
    return Math.ceil(text.length / 4);
};

export const AnalysisPane: React.FC<AnalysisPaneProps> = ({ 
    card, 
    onUpdate, 
    fileName, 
    avatarUrl, 
    avatarFile, 
    setAvatarUrl, 
    setAvatarFile, 
    isNewCharacter = false, 
    onSaveNew 
}) => {
    const { lorebooks } = useLorebook(); // Access global store
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'json' | 'png'>('json');

    // Function to embed linked lorebooks into the card before export
    const prepareCardForExport = useCallback((originalCard: CharacterCard): CharacterCard => {
      // Deep copy
      const exportCard = JSON.parse(JSON.stringify(originalCard)) as CharacterCard;
      
      // OPTION A: Embed Attached Lorebooks
      if (exportCard.attached_lorebooks && exportCard.attached_lorebooks.length > 0) {
          const attachedNames = exportCard.attached_lorebooks;
          const mergedEntries: WorldInfoEntry[] = [...(exportCard.char_book?.entries || [])];
          
          attachedNames.forEach(name => {
              const book = lorebooks.find(b => b.name === name);
              if (book && book.book.entries) {
                  // Clone entries to avoid mutation and add source tag
                  const entriesToAdd = JSON.parse(JSON.stringify(book.book.entries));
                  entriesToAdd.forEach((e: any) => {
                      e.source_lorebook = name; // Tag source
                      if (!e.uid) e.uid = `embed_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                  });
                  mergedEntries.push(...entriesToAdd);
              }
          });

          // Update card
          if (!exportCard.char_book) exportCard.char_book = { entries: [] };
          exportCard.char_book.entries = mergedEntries;
          
          // Clear attached list so recipient doesn't look for missing files
          delete exportCard.attached_lorebooks;
      }

      // Cleanup empty book
      if (exportCard.char_book && exportCard.char_book.entries.length === 0) {
          delete exportCard.char_book;
      }

      return exportCard;
    }, [lorebooks]);


    const tokenCounts = useMemo(() => {
        const description = estimateTokens(card.description);
        const personality = estimateTokens(card.personality);
        const first_mes = estimateTokens(card.first_mes);
        const mes_example = estimateTokens(card.mes_example);
        const total = description + personality + first_mes + mes_example;
        return { description, personality, first_mes, mes_example, total };
    }, [card]);

    // Opens the modal
    const handleExportClick = (type: 'json' | 'png') => {
        setExportType(type);
        setIsExportModalOpen(true);
    };

    // Executes the export after name confirmation
    const performExport = async (finalFileName: string) => {
        const cardToExport = prepareCardForExport(card); // Use the prepared card

        if (exportType === 'json') {
            const exportObject = buildExportObject(cardToExport);
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", finalFileName);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } else {
            if (!card || !avatarFile) return;
            setIsExporting(true);
            setError('');
            try {
                await exportToPng(cardToExport, avatarFile, finalFileName);
            } catch (e) {
                setError(e instanceof Error ? `Lỗi xuất PNG: ${e.message}` : 'Đã xảy ra lỗi không xác định khi xuất tệp PNG.');
            } finally {
                setIsExporting(false);
            }
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if(avatarUrl) URL.revokeObjectURL(avatarUrl);
            setAvatarUrl(URL.createObjectURL(file));
            setAvatarFile(file);
        }
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg h-full space-y-6 flex flex-col">
            <div className="flex-grow space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-sky-400 mb-2">Công cụ Thẻ</h3>
                    <p className="text-sm text-slate-400 mb-4">Quản lý tài nguyên, kiểm tra token và xuất bản.</p>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-lg text-slate-200 mb-3">Số lượng token ước tính</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-slate-400">Mô tả:</dt>
                        <dd className="text-right font-mono text-amber-400">{tokenCounts.description}</dd>
                        
                        <dt className="text-slate-400">Tính cách:</dt>
                        <dd className="text-right font-mono text-amber-400">{tokenCounts.personality}</dd>

                        <dt className="text-slate-400">Lời chào đầu tiên:</dt>
                        <dd className="text-right font-mono text-amber-400">{tokenCounts.first_mes}</dd>

                        <dt className="text-slate-400">Ví dụ hội thoại:</dt>
                        <dd className="text-right font-mono text-amber-400">{tokenCounts.mes_example}</dd>

                        <div className="border-t border-slate-700 col-span-2 my-1"></div>
                        
                        <dt className="text-slate-300 font-bold">Tổng token cốt lõi:</dt>
                        <dd className="text-right font-mono text-amber-300 font-bold">{tokenCounts.total}</dd>
                    </dl>
                </div>
            </div>

            <div className="flex-shrink-0 space-y-4 pt-6 border-t border-slate-700">
                <h3 className="text-xl font-bold text-sky-400">{isNewCharacter ? "Tạo Avatar" : "Xuất Thẻ"}</h3>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative group">
                       {avatarUrl ? (
                           <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-2 border border-slate-700">Chưa có avatar</div>
                       )}
                    </div>
                    <div className="flex-grow">
                        <input type="file" accept="image/png,image/jpeg" onChange={handleAvatarUpload} className="sr-only" ref={avatarInputRef} />
                        <button onClick={() => avatarInputRef.current?.click()} className="w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-200">
                            {avatarUrl ? "Thay đổi Avatar" : "Tải lên Avatar"}
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Tải lên tệp .png hoặc .jpeg để dùng làm avatar cho thẻ.</p>
                    </div>
                </div>
                
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-sm">{error}</p>}

                {isNewCharacter ? (
                    <button 
                        onClick={onSaveNew} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Lưu Nhân Vật Mới
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleExportClick('json')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Xuất ra JSON
                        </button>
                        <button onClick={() => handleExportClick('png')} disabled={!avatarFile || isExporting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            {isExporting ? <Loader message="" /> : 'Xuất ra PNG'}
                        </button>
                    </div>
                )}
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onConfirm={performExport}
                initialFileName={fileName || card.name || 'character'}
                title={exportType === 'json' ? 'Xuất thẻ JSON' : 'Xuất thẻ PNG'}
                fileExtension={exportType === 'json' ? '.json' : '.png'}
            />
        </div>
    );
};
