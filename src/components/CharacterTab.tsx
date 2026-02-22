
import React, { useRef, useState, useMemo } from 'react';
import { CharacterEditor } from './CharacterEditor';
import { AnalysisPane } from './AnalysisPane';
import { useCharacter } from '../contexts/CharacterContext';
import type { CharacterInContext, CharacterCard, WorldInfoEntry } from '../types';
import { Loader } from './Loader';
import { CharacterBookFullScreenView } from './CharacterBookFullScreenView';
import { useToast } from './ToastSystem';

const NEW_CHARACTER_ID = '__NEW_CHARACTER__';

const DEFAULT_EMPTY_CARD: CharacterCard = {
    name: "",
    description: "",
    personality: "",
    first_mes: "",
    mes_example: "",
    scenario: "",
    system_prompt: "",
    post_history_instructions: "",
    tags: [],
    creator: "",
    character_version: "",
    alternate_greetings: [],
    extensions: {},
    spec: "chara_card_v3",
    spec_version: "3.0"
};

export const CharacterTab: React.FC = () => {
  const {
    characters,
    activeCharacterFileName,
    isLoading,
    error,
    loadCharacter,
    deleteActiveCharacter,
    updateActiveCharacter,
    createNewCharacter,
    setActiveCharacterFileName,
    setAvatarForActiveCharacter,
  } = useCharacter();

  const [isLorebookMode, setIsLorebookMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // --- Draft State for New Character ---
  const [draftCard, setDraftCard] = useState<CharacterCard>(DEFAULT_EMPTY_CARD);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null>(null);
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);

  const activeCharacter = activeCharacterFileName === NEW_CHARACTER_ID 
      ? { card: draftCard, fileName: 'New Character', avatarUrl: draftAvatarUrl, avatarFile: draftAvatarFile }
      : (activeCharacterFileName ? characters.find(c => c.fileName === activeCharacterFileName) : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadCharacter(e.target.files[0]);
      e.target.value = ''; // Allow re-uploading the same file
    }
  };

  const handleSetAvatar = (url: string | null, file: File | null) => {
      if (activeCharacterFileName === NEW_CHARACTER_ID) {
          if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
          setDraftAvatarUrl(url);
          setDraftAvatarFile(file);
      } else if (activeCharacterFileName) {
          setAvatarForActiveCharacter(activeCharacterFileName, url, file);
      }
  };
  
  // Updated: Handle saving both entries AND attached books
  const handleLorebookSave = (updatedEntries: WorldInfoEntry[], attachedBooks?: string[]) => {
      if (!activeCharacter) return;
      
      const newCard = JSON.parse(JSON.stringify(activeCharacter.card));
      if (!newCard.char_book) newCard.char_book = { entries: [] };
      newCard.char_book.entries = updatedEntries;
      
      // Update attached list
      newCard.attached_lorebooks = attachedBooks;
      
      if (activeCharacterFileName === NEW_CHARACTER_ID) {
          setDraftCard(newCard);
      } else {
          updateActiveCharacter(newCard);
      }
      setIsLorebookMode(false);
  };

  const startCreatingNew = () => {
      setDraftCard(JSON.parse(JSON.stringify(DEFAULT_EMPTY_CARD)));
      if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
      setDraftAvatarUrl(null);
      setDraftAvatarFile(null);
      setActiveCharacterFileName(NEW_CHARACTER_ID);
  };

  const saveNewCharacter = async () => {
      if (!draftCard.name.trim()) {
          showToast("Tên nhân vật không được để trống!", "error");
          return;
      }
      try {
          await createNewCharacter(draftCard, draftAvatarFile);
          showToast("Đã tạo nhân vật thành công!", "success");
      } catch (e) {
          showToast(`Lỗi tạo nhân vật: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
  };

  if (isLoading && characters.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader message="Đang tải nhân vật..." />
      </div>
    );
  }

  // --- RENDER LOGIC ---

  if (isLorebookMode && activeCharacter) {
      return (
          <CharacterBookFullScreenView 
              initialEntries={activeCharacter.card.char_book?.entries || []}
              initialAttached={activeCharacter.card.attached_lorebooks || []}
              onSave={handleLorebookSave}
              onClose={() => setIsLorebookMode(false)}
          />
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Panel: Character List and Actions */}
      <div className="md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3 max-h-[calc(100vh-100px)]">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-bold text-slate-200">Danh sách Nhân vật</h3>
           <button
             onClick={startCreatingNew}
             className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold transition-colors"
           >
             + Mới
           </button>
        </div>
        
        <div className="flex-grow overflow-hidden flex flex-col">
          <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
            {characters.length === 0 ? (
                <p className="text-slate-500 text-sm italic text-center py-4">Chưa có nhân vật.</p>
            ) : (
                characters.map(char => (
                  <button
                    key={char.fileName}
                    onClick={() => setActiveCharacterFileName(char.fileName)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-3 ${
                      activeCharacterFileName === char.fileName
                        ? 'bg-sky-600/30 text-white ring-1 ring-sky-500/50'
                        : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600/50">
                        {char.avatarUrl ? (
                            <img src={char.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">?</div>
                        )}
                    </div>
                    <span className="truncate">{char.card.name || char.fileName}</span>
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2 flex-shrink-0 pt-3 border-t border-slate-700/50">
          {error && <p className="text-red-400 text-xs p-2 bg-red-900/30 rounded">{error}</p>}
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept=".png,.json"
            onChange={handleFileChange}
          />
          <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 text-xs rounded-lg transition-colors duration-200"
              >
                Tải lên (Import)
              </button>
              <button
                onClick={deleteActiveCharacter}
                disabled={!activeCharacter || activeCharacterFileName === NEW_CHARACTER_ID}
                className="w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/50"
              >
                Xóa
              </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="md:col-span-2">
        {activeCharacter ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CharacterEditor 
                  card={activeCharacter.card} 
                  onUpdate={activeCharacterFileName === NEW_CHARACTER_ID ? setDraftCard : updateActiveCharacter} 
                  onOpenLorebook={() => setIsLorebookMode(true)}
              />
            </div>
            <div className="lg:col-span-1">
              <AnalysisPane
                card={activeCharacter.card}
                onUpdate={activeCharacterFileName === NEW_CHARACTER_ID ? setDraftCard : updateActiveCharacter}
                fileName={activeCharacter.fileName}
                avatarUrl={activeCharacter.avatarUrl}
                avatarFile={activeCharacter.avatarFile}
                setAvatarUrl={(url) => handleSetAvatar(url, activeCharacter.avatarFile)}
                setAvatarFile={(file) => handleSetAvatar(activeCharacter.avatarUrl, file)}
                isNewCharacter={activeCharacterFileName === NEW_CHARACTER_ID}
                onSaveNew={saveNewCharacter}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 min-h-[60vh]">
            <div className="text-center text-slate-500">
              <p className="font-semibold">Chọn hoặc tạo mới nhân vật</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
