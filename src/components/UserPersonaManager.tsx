
import React, { useState } from 'react';
import { useUserPersona } from '../contexts/UserPersonaContext';
import type { UserPersona } from '../types';
import { Loader } from './Loader';
import { LabeledInput } from './ui/LabeledInput';
import { LabeledTextarea } from './ui/LabeledTextarea';
import { ToggleInput } from './ui/ToggleInput';

const PersonaEditor: React.FC<{ persona: UserPersona; onUpdate: (persona: UserPersona) => void }> = ({ persona, onUpdate }) => {
    return (
        <div className="bg-slate-800/50 p-6 rounded-xl space-y-4 h-full flex flex-col">
            <h3 className="text-xl font-bold text-sky-400">Chỉnh sửa Hồ sơ</h3>
            <LabeledInput 
                label="Tên Hồ sơ" 
                value={persona.name} 
                onChange={(e) => onUpdate({ ...persona, name: e.target.value })} 
            />
            <div className="flex-grow flex flex-col">
                <LabeledTextarea
                    label="Mô tả"
                    value={persona.description}
                    onChange={(e) => onUpdate({ ...persona, description: e.target.value })}
                    rows={10}
                    containerClassName="flex-grow flex flex-col"
                    className="flex-grow"
                    placeholder="Mô tả về con người, tính cách, hoặc vai trò bạn muốn nhập vai..."
                />
            </div>
        </div>
    );
};

export const UserPersonaManager: React.FC = () => {
    const {
        personas,
        activePersonaId,
        isLoading,
        error,
        addOrUpdatePersona,
        deletePersona,
        setActivePersonaId,
    } = useUserPersona();

    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

    const handleCreateNew = () => {
        const newPersona: UserPersona = {
            id: `persona_${Date.now()}`,
            name: 'Hồ sơ Mới',
            description: '',
        };
        addOrUpdatePersona(newPersona);
        setSelectedPersonaId(newPersona.id);
    };

    const handleDelete = () => {
        if (selectedPersonaId && window.confirm('Bạn có chắc chắn muốn xóa hồ sơ này không?')) {
            deletePersona(selectedPersonaId);
            setSelectedPersonaId(null);
        }
    };

    const handleToggleActive = (personaId: string) => {
        if (activePersonaId === personaId) {
            setActivePersonaId(null); // Tắt nếu đang được bật
        } else {
            setActivePersonaId(personaId); // Bật
        }
    };
    
    const selectedPersona = personas.find(p => p.id === selectedPersonaId) || null;

    if (isLoading) {
        return <Loader message="Đang tải hồ sơ..." />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-200">Danh sách Hồ sơ</h3>
                     <button onClick={handleCreateNew} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold transition-colors">
                        + Mới
                    </button>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
                    {personas.length === 0 ? (
                            <p className="text-slate-500 text-sm italic text-center py-4">Chưa có hồ sơ nào.</p>
                    ) : (
                        personas.map(persona => (
                            <div key={persona.id} className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${selectedPersonaId === persona.id ? 'bg-sky-600/30 ring-1 ring-sky-500/50' : 'hover:bg-slate-700/50'}`}>
                                <div className="flex items-center justify-between">
                                    <span 
                                        className={`truncate flex-grow mr-4 cursor-pointer ${selectedPersonaId === persona.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                        onClick={() => setSelectedPersonaId(persona.id)}
                                    >
                                        {persona.name}
                                    </span>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <ToggleInput 
                                            checked={activePersonaId === persona.id}
                                            onChange={() => handleToggleActive(persona.id)}
                                            clean
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                 <div className="mt-auto pt-3 border-t border-slate-700/50">
                    {error && <p className="text-red-400 text-xs p-2 bg-red-900/30 rounded mb-2">{error}</p>}
                     <button onClick={handleDelete} disabled={!selectedPersonaId} className="w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/50 transition-colors">
                        Xóa
                    </button>
                </div>
            </div>

            <div className="md:col-span-2">
                {selectedPersona ? (
                    <PersonaEditor persona={selectedPersona} onUpdate={addOrUpdatePersona} />
                ) : (
                    <div className="flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 min-h-[40vh]">
                        <div className="text-center text-slate-500">
                            <p className="font-semibold">Chọn một hồ sơ để chỉnh sửa</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
