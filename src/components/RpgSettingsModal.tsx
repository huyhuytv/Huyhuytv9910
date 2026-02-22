
import React, { useState, useEffect, useRef } from 'react';
import type { RPGDatabase, RPGSettings, RPGTable, RPGColumn } from '../types/rpg';
import type { WorldInfoEntry } from '../types';
import { MODEL_OPTIONS } from '../services/settingsService';
import { LabeledInput } from './ui/LabeledInput';
import { ToggleInput } from './ui/ToggleInput';
import { SelectInput } from './ui/SelectInput';
import { DEFAULT_MEDUSA_PROMPT } from '../services/medusaService';
import { parseLooseJson } from '../utils';

interface RpgSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    database: RPGDatabase;
    onSave: (newDb: RPGDatabase) => void;
    lorebookEntries?: WorldInfoEntry[];
}

type Tab = 'operation' | 'prompt' | 'context' | 'data';

const MACROS = [
    { label: '{{rpg_schema}}', desc: 'Cấu trúc bảng & cột' },
    { label: '{{rpg_data}}', desc: 'Dữ liệu hiện tại (JSON/Table)' },
    { label: '{{global_rules}}', desc: 'Luật chơi chung' },
    { label: '{{chat_history}}', desc: 'Lịch sử hội thoại gần nhất' },
    { label: '{{rpg_lorebook}}', desc: 'Dữ liệu Sổ tay (Hybrid)' },
];

const convertLegacyToV2 = (rawData: any): RPGDatabase => {
    const tables: RPGTable[] = [];
    
    const sheetKeys = Object.keys(rawData).filter(k => 
        (k.startsWith('sheet_') || (rawData[k]?.content && Array.isArray(rawData[k].content))) &&
        typeof rawData[k] === 'object'
    );

    if (sheetKeys.length === 0) {
        throw new Error("Không tìm thấy dữ liệu bảng hợp lệ (ChatSheets format).");
    }

    for (const key of sheetKeys) {
        const sheet = rawData[key];
        const content = sheet.content || [];
        
        if (content.length === 0) continue;

        const headerRow = content[0];
        const validHeaders = headerRow.slice(1);
        
        const columns: RPGColumn[] = validHeaders.map((header: string, index: number) => ({
            id: String(index), 
            label: header || `Column ${index + 1}`,
            type: 'string'
        }));

        const rows = content.slice(1).map((row: any[]) => {
            const newRow = [...row];
            newRow[0] = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            return newRow;
        });

        const source = sheet.sourceData || {};
        const aiRules = {
            init: source.initNode,
            update: source.updateNode,
            insert: source.insertNode,
            delete: source.deleteNode
        };

        const exp = sheet.exportConfig || {};
        const exportConfig = {
            enabled: exp.enabled !== false,
            format: 'markdown_table' as const,
            strategy: exp.entryType === 'keyword' ? 'on_change' as const : 'always' as const,
            
            splitByRow: exp.splitByRow,
            entryName: exp.entryName || sheet.name,
            entryType: exp.entryType,
            keywords: exp.keywords,
            preventRecursion: exp.preventRecursion,
            injectIntoWorldbook: exp.injectIntoWorldbook
        };

        tables.push({
            config: {
                id: sheet.uid || key,
                name: sheet.name || key,
                description: source.note,
                columns,
                export: exportConfig,
                aiRules,
                orderNo: sheet.orderNo
            },
            data: { rows }
        });
    }

    tables.sort((a, b) => (a.config.orderNo || 0) - (b.config.orderNo || 0));

    return {
        version: 2,
        tables,
        globalRules: "Hệ thống RPG Tự động.",
        lastUpdated: Date.now()
    };
};

export const RpgSettingsModal: React.FC<RpgSettingsModalProps> = ({ isOpen, onClose, database, onSave, lorebookEntries = [] }) => {
    const [activeTab, setActiveTab] = useState<Tab>('operation');
    const [settings, setSettings] = useState<RPGSettings>({
        triggerMode: 'auto',
        executionMode: 'standalone', 
        modelId: '',
        customSystemPrompt: DEFAULT_MEDUSA_PROMPT,
        pinnedLorebookUids: []
    });
    const [jsonInput, setJsonInput] = useState(''); 
    const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge'); 
    
    const promptInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSettings({
                triggerMode: database.settings?.triggerMode || 'auto',
                executionMode: database.settings?.executionMode || 'standalone',
                modelId: database.settings?.modelId || '',
                customSystemPrompt: database.settings?.customSystemPrompt || DEFAULT_MEDUSA_PROMPT,
                triggerKeywords: database.settings?.triggerKeywords || [],
                pinnedLorebookUids: database.settings?.pinnedLorebookUids || []
            });
            setJsonInput(''); 
            setImportMode('merge'); 
        }
    }, [isOpen, database]);

    const handleSave = () => {
        const newDb = { ...database, settings: settings };
        onSave(newDb);
        onClose();
    };

    const insertMacro = (macro: string) => {
        if (promptInputRef.current) {
            const start = promptInputRef.current.selectionStart;
            const end = promptInputRef.current.selectionEnd;
            const text = settings.customSystemPrompt || '';
            const newText = text.substring(0, start) + macro + text.substring(end);
            setSettings({ ...settings, customSystemPrompt: newText });
            
            setTimeout(() => {
                promptInputRef.current?.focus();
                promptInputRef.current?.setSelectionRange(start + macro.length, start + macro.length);
            }, 0);
        }
    };

    const handleExport = (mode: 'schema' | 'full') => {
        const exportData = JSON.parse(JSON.stringify(database));
        
        if (mode === 'schema') {
            exportData.tables.forEach((t: any) => {
                t.data = { rows: [] };
            });
            exportData.lastUpdated = Date.now();
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MythicRPG_${mode}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const performMerge = (importedDb: RPGDatabase) => {
        const mergedDb = { ...database };
        const currentTables = [...mergedDb.tables];

        importedDb.tables.forEach(importedTable => {
            const existingIndex = currentTables.findIndex(t => t.config.id === importedTable.config.id);
            if (existingIndex !== -1) {
                currentTables[existingIndex] = importedTable;
            } else {
                currentTables.push(importedTable);
            }
        });

        mergedDb.tables = currentTables;
        mergedDb.lastUpdated = Date.now();
        onSave(mergedDb);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                let jsonContent = JSON.parse(ev.target?.result as string);

                // --- SPECIAL HANDLING: EXTRACT 'TEMPLATE' KEY IF PRESENT ---
                // Support extracting only the RPG data part from a Composite Config file
                if (jsonContent.template && typeof jsonContent.template === 'object') {
                    console.log("Detected Composite Config. Extracting 'template' part for import.");
                    jsonContent = jsonContent.template;
                }
                // -----------------------------------------------------------

                let importedDb: RPGDatabase;

                if (jsonContent.tables && Array.isArray(jsonContent.tables)) {
                    importedDb = jsonContent;
                } else {
                    try {
                        importedDb = convertLegacyToV2(jsonContent);
                    } catch (conversionError) {
                        throw new Error("Không nhận diện được định dạng file.");
                    }
                }
                
                if (importMode === 'overwrite') {
                    importedDb.lastUpdated = Date.now();
                    onSave(importedDb);
                } else {
                    performMerge(importedDb);
                }
                
                onClose();
            } catch (err) {
                alert("Lỗi nhập file: " + (err instanceof Error ? e.message : String(err)));
            }
        };
        reader.readAsText(file);
    };

    const handleImportText = () => {
        if (!jsonInput.trim()) return;
        try {
            let rawData = parseLooseJson(jsonInput);

            // --- SPECIAL HANDLING: EXTRACT 'TEMPLATE' KEY IF PRESENT ---
            if (rawData.template && typeof rawData.template === 'object') {
                console.log("Detected Composite Config. Extracting 'template' part for import.");
                rawData = rawData.template;
            }
            // -----------------------------------------------------------

            let tablesToMerge: RPGTable[] = [];

            if (rawData.tables && Array.isArray(rawData.tables)) {
                tablesToMerge = rawData.tables;
            } else if (rawData.config && rawData.config.id) {
                const tableData = rawData.data || { rows: [] };
                tablesToMerge = [{ config: rawData.config, data: tableData }];
            } else {
                try {
                    const legacyDb = convertLegacyToV2(rawData);
                    tablesToMerge = legacyDb.tables;
                } catch (e) {
                    throw new Error("Không nhận diện được cấu trúc JSON.");
                }
            }

            if (importMode === 'overwrite') {
                const newDb: RPGDatabase = {
                    version: 2,
                    tables: tablesToMerge,
                    globalRules: (rawData as RPGDatabase).globalRules || "Hệ thống RPG Tự động.",
                    settings: (rawData as RPGDatabase).settings,
                    lastUpdated: Date.now()
                };
                onSave(newDb);
                alert(`Đã ghi đè dữ liệu thành công (${tablesToMerge.length} bảng).`);
            } else {
                const tempDb: RPGDatabase = {
                    version: 2,
                    tables: tablesToMerge,
                    lastUpdated: Date.now()
                };
                performMerge(tempDb);
                alert(`Đã gộp thành công ${tablesToMerge.length} bảng dữ liệu!`);
            }

            setJsonInput('');
            
        } catch (e) {
            alert("Lỗi nhập văn bản: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const togglePinnedLorebook = (uid: string) => {
        const currentPinned = settings.pinnedLorebookUids || [];
        if (currentPinned.includes(uid)) {
            setSettings({ ...settings, pinnedLorebookUids: currentPinned.filter(id => id !== uid) });
        } else {
            setSettings({ ...settings, pinnedLorebookUids: [...currentPinned, uid] });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
            <div className="bg-slate-900 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                        <span>⚙️</span> Cấu hình Mythic Engine
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        aria-label="Đóng cấu hình"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900">
                    <button onClick={() => setActiveTab('operation')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'operation' ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>Vận hành</button>
                    <button onClick={() => setActiveTab('prompt')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'prompt' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>Lời nhắc (Prompt)</button>
                    <button onClick={() => setActiveTab('context')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'context' ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>Ngữ cảnh (Context)</button>
                    <button onClick={() => setActiveTab('data')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'data' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>Dữ liệu (Data)</button>
                </div>

                {/* Body */}
                <div className="flex-grow p-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                    
                    {/* TAB A: OPERATION */}
                    {activeTab === 'operation' && (
                        <div className="space-y-6">
                            {/* Execution Strategy */}
                            <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                                <SelectInput
                                    label="1. Chiến lược Thực thi (Execution Strategy)"
                                    value={settings.executionMode || 'standalone'}
                                    onChange={(e) => setSettings({ ...settings, executionMode: e.target.value as any })}
                                    options={[
                                        { value: 'standalone', label: '🛡️ 2-Pass (Tách biệt - An toàn)' },
                                        { value: 'integrated', label: '⚡ 1-Pass (Tích hợp - Tốc độ)' }
                                    ]}
                                />
                                <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                    {settings.executionMode === 'integrated' ? (
                                        <p><strong>1-Pass:</strong> Logic RPG được xử lý cùng lúc khi tạo hội thoại. Tốc độ nhanh nhất, tiết kiệm token, nhưng đôi khi AI có thể bỏ sót luật chơi.</p>
                                    ) : (
                                        <p><strong>2-Pass:</strong> Logic RPG chạy riêng biệt sau khi hội thoại hoàn tất. Đảm bảo độ chính xác cao nhất và an toàn dữ liệu, nhưng tốn thêm thời gian xử lý.</p>
                                    )}
                                </div>

                                {/* Conditionally show Model Selection for 2-Pass (Standalone) */}
                                {settings.executionMode === 'standalone' && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in-up">
                                        <SelectInput
                                            label="Model xử lý Logic (Chỉ cho 2-Pass)"
                                            value={settings.modelId || ''}
                                            onChange={(e) => setSettings({ ...settings, modelId: e.target.value })}
                                            options={[
                                                { value: '', label: 'Sử dụng Model Chat mặc định' },
                                                ...MODEL_OPTIONS.map(m => ({ value: m.id, label: m.name }))
                                            ]}
                                            tooltip="Chọn model riêng cho Medusa. Khuyên dùng Gemini Flash hoặc Flash-Lite để tiết kiệm chi phí và tăng tốc độ."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Trigger Mode */}
                            <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                                <SelectInput
                                    label="2. Chế độ Kích hoạt (Trigger Mode)"
                                    value={settings.triggerMode || 'auto'}
                                    onChange={(e) => setSettings({ ...settings, triggerMode: e.target.value as any })}
                                    options={[
                                        { value: 'auto', label: '🔴 Tự động (Auto)' },
                                        { value: 'keyword', label: '🟡 Từ khóa (Keyword)' },
                                        { value: 'manual', label: '🔵 Thủ công (Manual)' }
                                    ]}
                                />
                                <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                                    {settings.triggerMode === 'auto' && <p>Hệ thống tự động chạy sau mỗi lượt trả lời của AI.</p>}
                                    {settings.triggerMode === 'keyword' && <p>Chỉ chạy khi trong tin nhắn (User/AI) xuất hiện từ khóa quy định.</p>}
                                    {settings.triggerMode === 'manual' && <p>Chỉ chạy khi bạn bấm nút "Force Run" trong công cụ.</p>}
                                </div>

                                {/* Conditionally show Keywords for Keyword Mode */}
                                {settings.triggerMode === 'keyword' && (
                                    <div className="mt-4 pt-4 border-t border-slate-700 animate-fade-in-up">
                                        <LabeledInput 
                                            label="Danh sách từ khóa (phân tách bằng dấu phẩy)"
                                            value={(settings.triggerKeywords || []).join(', ')}
                                            onChange={(e) => setSettings({ ...settings, triggerKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                                            placeholder="ví dụ: /buy, [CHECK], inventory"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB B: PROMPT */}
                    {activeTab === 'prompt' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/30 text-xs text-indigo-200">
                                <strong className="block mb-1">Thiết kế tính cách Game Master (Medusa)</strong>
                                Bạn có thể sửa đổi prompt dưới đây để biến Medusa thành một Shopkeeper khó tính, một vị thần hào phóng, hoặc đơn giản là một hệ thống logic lạnh lùng.
                            </div>
                            
                            <div className="flex gap-2 flex-wrap">
                                {MACROS.map(m => (
                                    <button 
                                        key={m.label} 
                                        onClick={() => insertMacro(m.label)}
                                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs font-mono rounded border border-slate-600 text-sky-300"
                                        title={m.desc}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                                <button onClick={() => setSettings({ ...settings, customSystemPrompt: DEFAULT_MEDUSA_PROMPT })} className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded hover:bg-red-900/50 ml-auto">
                                    Khôi phục Mặc định
                                </button>
                            </div>

                            <textarea 
                                ref={promptInputRef}
                                value={settings.customSystemPrompt}
                                onChange={(e) => setSettings({ ...settings, customSystemPrompt: e.target.value })}
                                className="flex-grow w-full bg-slate-800 border border-slate-600 rounded-lg p-4 font-mono text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>
                    )}

                    {/* TAB C: CONTEXT */}
                    {activeTab === 'context' && (
                        <div className="space-y-4">
                            <div className="bg-fuchsia-900/20 border border-fuchsia-500/30 p-4 rounded-lg">
                                <h4 className="font-bold text-fuchsia-300 mb-1">Cấu hình Ngữ cảnh Lai (Hybrid Context)</h4>
                                <p className="text-sm text-slate-300">
                                    Ngoài các mục được hệ thống Chat tự động quét (Scan), bạn có thể chọn thủ công các mục Sổ tay quan trọng bên dưới để <strong>luôn luôn gửi</strong> cho Medusa (ví dụ: Luật chơi, Định nghĩa chỉ số).
                                </p>
                            </div>

                            <div className="space-y-2">
                                {lorebookEntries.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4 italic">Không tìm thấy mục Sổ tay nào.</p>
                                ) : (
                                    lorebookEntries.map((entry, idx) => {
                                        const uid = entry.uid || `entry_${idx}`;
                                        const isPinned = (settings.pinnedLorebookUids || []).includes(uid);
                                        
                                        return (
                                            <div 
                                                key={uid} 
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                    isPinned 
                                                    ? 'bg-fuchsia-900/20 border-fuchsia-500/50' 
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                                }`}
                                            >
                                                <div className="flex-grow min-w-0 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <h5 className={`font-bold text-sm truncate ${isPinned ? 'text-fuchsia-300' : 'text-slate-300'}`}>
                                                            {entry.comment || `Mục không tên #${idx + 1}`}
                                                        </h5>
                                                        {entry.constant && <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600">Constant</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono mt-1 line-clamp-1">
                                                        {entry.content}
                                                    </p>
                                                </div>
                                                <ToggleInput 
                                                    checked={isPinned} 
                                                    onChange={() => togglePinnedLorebook(uid)} 
                                                    label="Gửi cho Medusa" 
                                                    clean
                                                />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB D: DATA */}
                    {activeTab === 'data' && (
                        <div className="flex flex-col gap-8 h-full">
                            
                            {/* SECTION 1: FILE OPERATIONS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* EXPORT */}
                                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center flex flex-col justify-center hover:border-emerald-500/50 transition-colors">
                                    <div className="text-4xl mb-4">📤</div>
                                    <h3 className="text-lg font-bold text-emerald-400 mb-2">Xuất Dữ liệu (File)</h3>
                                    <p className="text-sm text-slate-400 mb-6">Lưu trữ hoặc chia sẻ hệ thống RPG.</p>
                                    
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => handleExport('full')}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg"
                                        >
                                            Xuất Trọn gói (Full Save)
                                        </button>
                                        <button 
                                            onClick={() => handleExport('schema')}
                                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-emerald-300 font-bold rounded-lg border border-slate-600"
                                        >
                                            Chỉ Xuất Cấu trúc
                                        </button>
                                    </div>
                                </div>

                                {/* IMPORT */}
                                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center flex flex-col justify-center hover:border-sky-500/50 transition-colors">
                                    <div className="text-4xl mb-4">📥</div>
                                    <h3 className="text-lg font-bold text-sky-400 mb-2">Nhập Dữ liệu (File)</h3>
                                    
                                    <div className="flex justify-center gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                                            <input 
                                                type="radio" 
                                                checked={importMode === 'merge'} 
                                                onChange={() => setImportMode('merge')} 
                                                className="accent-sky-500"
                                            />
                                            <span>Gộp (Merge)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white">
                                            <input 
                                                type="radio" 
                                                checked={importMode === 'overwrite'} 
                                                onChange={() => setImportMode('overwrite')} 
                                                className="accent-red-500"
                                            />
                                            <span className={importMode === 'overwrite' ? 'text-red-400' : ''}>Ghi đè (Overwrite)</span>
                                        </label>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-6">
                                        {importMode === 'merge' ? 'Giữ dữ liệu cũ, thêm dữ liệu mới.' : 'Xóa toàn bộ dữ liệu cũ và thay thế bằng dữ liệu mới.'}
                                    </p>
                                    
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept=".json" 
                                        onChange={handleImportFile}
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-8 border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-xl text-slate-400 hover:text-sky-400 transition-all flex flex-col items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        <span>Chọn file JSON để tải lên</span>
                                    </button>
                                </div>
                            </div>

                            {/* SECTION 2: PASTE IMPORT */}
                            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">📋</span>
                                    <h3 className="text-lg font-bold text-indigo-400">Nhập nhanh từ văn bản (JSON)</h3>
                                </div>
                                <div className="space-y-3">
                                    <textarea
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        placeholder="Dán mã JSON (Database đầy đủ hoặc Bảng đơn lẻ) vào đây..."
                                        rows={4}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 font-mono text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <p className="text-xs text-slate-500 italic">Hỗ trợ JSON lỏng lẻo.</p>
                                            <div className="flex gap-2">
                                                <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-400">
                                                    <input type="radio" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="accent-indigo-500"/> Merge
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer text-xs text-slate-400">
                                                    <input type="radio" checked={importMode === 'overwrite'} onChange={() => setImportMode('overwrite')} className="accent-red-500"/> Overwrite
                                                </label>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleImportText}
                                            disabled={!jsonInput.trim()}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Nhập Ngay
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">Hủy bỏ</button>
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-lg">Lưu Cấu hình</button>
                </div>
            </div>
        </div>
    );
};
