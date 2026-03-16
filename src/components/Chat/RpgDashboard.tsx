
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { RPGDatabase, RPGTable } from '../../types/rpg';
import { useChatStore } from '../../store/chatStore';
import { useCharacter } from '../../contexts/CharacterContext'; 
import { useToast } from '../ToastSystem';
import { RpgRowItem } from './RpgTableComponents';
import { parseLooseJson } from '../../utils';

interface RpgDashboardProps {
    data: RPGDatabase | undefined;
    isOpen: boolean;
    onClose: () => void;
}

// --- INTERACTIVE LIST VIEW COMPONENT (Local State) ---

const InteractiveListView: React.FC<{ table: RPGTable }> = ({ table }) => {
    const { config } = table;
    const { replaceRpgTableRows } = useChatStore();
    const { showToast } = useToast();

    // Local State for Drafting
    const [draftRows, setDraftRows] = useState<any[][]>([]);
    const [deletedRowIndices, setDeletedRowIndices] = useState<Set<number>>(new Set());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    // NEW: Expansion State
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

    // Sync draft with store when table changes or opens
    useEffect(() => {
        if (table.data.rows) {
            setDraftRows(JSON.parse(JSON.stringify(table.data.rows)));
            setDeletedRowIndices(new Set());
            setExpandedIndices(new Set()); // Reset expansion
            setHasUnsavedChanges(false);
        }
    }, [table.config.id, table.data.rows]);

    // -- Handlers --

    const handleCellUpdate = (rowIdx: number, colIdx: number, value: any) => {
        setDraftRows(prev => {
            const next = [...prev];
            next[rowIdx] = [...next[rowIdx]]; 
            next[rowIdx][colIdx + 1] = value; // +1 to skip UUID
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleAddRow = () => {
        const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newRow = new Array(config.columns.length + 1).fill("");
        newRow[0] = newId;
        
        setDraftRows(prev => [...prev, newRow]);
        // Auto expand new row
        setExpandedIndices(prev => new Set(prev).add(draftRows.length));
        setHasUnsavedChanges(true);
    };

    const toggleDeleteRow = (rowIdx: number) => {
        setDeletedRowIndices(prev => {
            const next = new Set(prev);
            if (next.has(rowIdx)) {
                next.delete(rowIdx);
            } else {
                next.add(rowIdx);
                // Also collapse if deleting
                if (expandedIndices.has(rowIdx)) {
                    const newExpanded = new Set(expandedIndices);
                    newExpanded.delete(rowIdx);
                    setExpandedIndices(newExpanded);
                }
            }
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleRestoreRow = (rowIdx: number) => {
        setDeletedRowIndices(prev => {
            const next = new Set(prev);
            next.delete(rowIdx);
            return next;
        });
        setHasUnsavedChanges(true);
    };
    
    // EXPANSION HANDLERS
    const toggleExpandRow = (rowIdx: number) => {
        setExpandedIndices(prev => {
            const next = new Set(prev);
            if (next.has(rowIdx)) next.delete(rowIdx);
            else next.add(rowIdx);
            return next;
        });
    };

    const handleExpandAll = () => {
        const allIndices = draftRows.map((_, i) => i);
        setExpandedIndices(new Set(allIndices));
    };

    const handleCollapseAll = () => {
        setExpandedIndices(new Set());
    };

    const handleSaveChanges = () => {
        const finalRows = draftRows.filter((_, index) => !deletedRowIndices.has(index));
        replaceRpgTableRows(config.id, finalRows);
        setHasUnsavedChanges(false);
        setDeletedRowIndices(new Set());
        showToast("Đã lưu thay đổi vào cơ sở dữ liệu!", "success");
    };

    const handleCancelChanges = () => {
        if (confirm("Bạn có chắc muốn hủy mọi thay đổi chưa lưu?")) {
            setDraftRows(JSON.parse(JSON.stringify(table.data.rows)));
            setDeletedRowIndices(new Set());
            setExpandedIndices(new Set());
            setHasUnsavedChanges(false);
        }
    };

    const activeCount = draftRows.length - deletedRowIndices.size;
    const pendingDeleteCount = deletedRowIndices.size;

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            {/* List Header Info & Controls */}
            <div className="px-4 py-3 border-b border-slate-700/50 flex flex-wrap justify-between items-center text-xs bg-slate-800/30 gap-2">
                <div className="text-slate-400">
                    <span>Tổng: <strong className="text-sky-400">{activeCount}</strong></span>
                    {pendingDeleteCount > 0 && <span className="text-red-400 ml-2">({pendingDeleteCount} chờ xóa)</span>}
                    {hasUnsavedChanges && <span className="text-amber-400 font-bold italic ml-2">● Chưa lưu</span>}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExpandAll} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors" title="Mở rộng tất cả">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={handleCollapseAll} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors" title="Thu gọn tất cả">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2">
                {draftRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 italic border-2 border-dashed border-slate-700/50 rounded-lg">
                        <p>Bảng trống.</p>
                        <button onClick={handleAddRow} className="mt-2 text-sky-400 hover:underline text-sm font-bold">Thêm dòng mới ngay</button>
                    </div>
                ) : (
                    draftRows.map((row, rowIdx) => (
                        <RpgRowItem
                            key={row[0]} // UUID
                            row={row}
                            columns={config.columns}
                            rowIndex={rowIdx}
                            onCellUpdate={(colIdx, val) => handleCellUpdate(rowIdx, colIdx, val)}
                            onToggleDelete={() => toggleDeleteRow(rowIdx)}
                            onRestore={() => handleRestoreRow(rowIdx)}
                            isPendingDelete={deletedRowIndices.has(rowIdx)}
                            isExpanded={expandedIndices.has(rowIdx)}
                            onToggleExpand={() => toggleExpandRow(rowIdx)}
                        />
                    ))
                )}
            </div>
            
            {/* Action Bar */}
            <div className="border-t border-slate-700 p-3 bg-slate-800 rounded-b-lg flex items-center gap-3 z-10 shadow-up">
                <button
                    onClick={handleAddRow}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded shadow-sm transition-colors border border-slate-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Thêm Dòng
                </button>

                <div className="flex-grow"></div>

                {hasUnsavedChanges && (
                    <>
                        <button
                            onClick={handleCancelChanges}
                            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSaveChanges}
                            className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow-lg shadow-sky-900/20 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Lưu Thay Đổi
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- DATA MANAGER COMPONENT ---

const DataManagerView: React.FC<{ 
    database: RPGDatabase, 
    onImport: (newDb: RPGDatabase) => void 
}> = ({ database, onImport }) => {
    const { showToast } = useToast();
    const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
    const [jsonInput, setJsonInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // EXPORT
    const handleExport = () => {
        const exportData = JSON.parse(JSON.stringify(database));
        // Add meta info
        exportData.meta = {
            exportedAt: new Date().toISOString(),
            type: 'mythic_rpg_full_save'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MythicRPG_Data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Đã tải xuống file dữ liệu!", "success");
    };

    // IMPORT LOGIC
    const processImport = (rawData: any) => {
        try {
            // Handle different wrapper formats
            let importedDb = rawData;
            
            // Check if it's a full snapshot or just RPG part
            if (rawData.data && rawData.data.tables) {
                 importedDb = rawData.data; // Snapshot wrapper
            } else if (rawData.template && rawData.template.tables) {
                 importedDb = rawData.template; // Config wrapper
            } else if (rawData.config && rawData.config.id && !rawData.tables) {
                 // Single table import
                 const tableData = rawData.data || { rows: [] };
                 importedDb = {
                     version: database.version || "2.0",
                     lastUpdated: Date.now(),
                     tables: [{ config: rawData.config, data: tableData }]
                 };
            }

            // Validation
            if (!importedDb.tables || !Array.isArray(importedDb.tables)) {
                throw new Error("Cấu trúc file không hợp lệ (Thiếu danh sách bảng).");
            }

            // Execution
            if (importMode === 'overwrite') {
                onImport(importedDb);
                showToast("Đã ghi đè dữ liệu thành công!", "success");
            } else {
                // Merge Logic
                const mergedDb = JSON.parse(JSON.stringify(database));
                const currentTables = mergedDb.tables as RPGTable[];

                importedDb.tables.forEach((impTable: RPGTable) => {
                    const existingIdx = currentTables.findIndex(t => t.config.id === impTable.config.id);
                    if (existingIdx !== -1) {
                        // Table exists: Merge Rows
                        // Strategy: Append new rows.
                        // (Ideally we check for UUID dupes but simple append is safer for "Merge")
                        const existingTable = currentTables[existingIdx];
                        if (impTable.data?.rows) {
                             existingTable.data.rows = [...existingTable.data.rows, ...impTable.data.rows];
                        }
                    } else {
                        // Table new: Add table
                        currentTables.push(impTable);
                    }
                });
                
                mergedDb.lastUpdated = Date.now();
                onImport(mergedDb);
                showToast("Đã gộp dữ liệu thành công!", "success");
            }

        } catch (e) {
            showToast(`Lỗi nhập liệu: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                processImport(json);
                e.target.value = ''; // Reset
            } catch (err) {
                showToast("Lỗi đọc file JSON.", "error");
            }
        };
        reader.readAsText(file);
    };

    const handleTextImport = () => {
        if (!jsonInput.trim()) return;
        try {
            const json = parseLooseJson(jsonInput);
            processImport(json);
            setJsonInput('');
        } catch (e) {
            showToast("Văn bản JSON không hợp lệ.", "error");
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">Xuất Dữ Liệu</h3>
                <p className="text-sm text-slate-400 mb-4">Lưu toàn bộ bảng và dữ liệu hiện tại về máy.</p>
                <button 
                    onClick={handleExport}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Tải xuống (Full Save)
                </button>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📥</span>
                    <h3 className="text-lg font-bold text-sky-400">Nhập Dữ Liệu</h3>
                </div>

                {/* Mode Selector */}
                <div className="flex gap-4 mb-6 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded transition-colors hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="importMode" 
                            checked={importMode === 'merge'} 
                            onChange={() => setImportMode('merge')} 
                            className="accent-sky-500"
                        />
                        <span className={importMode === 'merge' ? 'text-sky-400 font-bold' : 'text-slate-400'}>Gộp (Merge)</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded transition-colors hover:bg-slate-800">
                        <input 
                            type="radio" 
                            name="importMode" 
                            checked={importMode === 'overwrite'} 
                            onChange={() => setImportMode('overwrite')} 
                            className="accent-red-500"
                        />
                        <span className={importMode === 'overwrite' ? 'text-red-400 font-bold' : 'text-slate-400'}>Ghi đè (Overwrite)</span>
                    </label>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-lg text-slate-400 hover:text-sky-400 transition-colors flex flex-col items-center justify-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <span>Chọn file JSON</span>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
                    </div>

                    <div className="relative">
                        <textarea 
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder="Hoặc dán mã JSON vào đây..."
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-sky-500"
                        />
                        <button 
                            onClick={handleTextImport}
                            disabled={!jsonInput.trim()}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Nhập Ngay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const RpgDashboard: React.FC<RpgDashboardProps> = ({ data, isOpen, onClose }) => {
    // We use "activeView" to track if we show a specific table (by ID) or the settings page.
    const [activeView, setActiveView] = useState<string | null>(null);
    
    // Store Actions
    const { reloadRpgConfig, card, setSessionData } = useChatStore();
    const { characters } = useCharacter();
    const { showToast } = useToast();

    // Auto-select first table if nothing selected
    useMemo(() => {
        if (isOpen && !activeView && data?.tables?.length) {
            setActiveView(data.tables[0].config.id);
        }
    }, [isOpen, data]);

    const handleReloadConfig = () => {
        if (!card) return;
        
        const sourceChar = characters.find(c => c.fileName === card.fileName);
        
        if (!sourceChar || !sourceChar.card.rpg_data) {
            showToast("Không tìm thấy dữ liệu RPG gốc trong Thẻ nhân vật.", "error");
            return;
        }

        reloadRpgConfig(sourceChar.card.rpg_data);
        showToast("Đã đồng bộ cấu hình từ thẻ gốc thành công!", "success");
    };

    const handleCopyTable = (table: RPGTable) => {
        try {
            const json = JSON.stringify(table, null, 2);
            navigator.clipboard.writeText(json);
            showToast(`Đã sao chép bảng "${table.config.name}" vào clipboard.`, "success");
        } catch (e) {
            showToast("Lỗi sao chép bảng.", "error");
        }
    };

    // Update the DB in store (Import logic)
    const handleUpdateDb = (newDb: RPGDatabase) => {
        if (!card) return;
        const updatedCard = { ...card, rpg_data: newDb };
        // Update session data (which updates context)
        setSessionData({ card: updatedCard });
    };

    if (!isOpen || !data) return null;

    const activeTable = data.tables ? data.tables.find(t => t.config.id === activeView) : undefined;
    const isSettingsView = activeView === 'data_manager';

    return (
        <div className="fixed inset-y-0 right-0 z-[100] w-[600px] max-w-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform animate-slide-in-right">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <div>
                    <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2">
                        <span>⚔️</span> Mythic Dashboard
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                        Live Editor • Update: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'N/A'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReloadConfig}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 rounded transition-colors flex items-center gap-1"
                        title="Nạp lại cấu hình (Cột, Luật, Live-Link) từ Thẻ gốc nhưng giữ nguyên Dữ liệu chơi."
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Đồng bộ Cấu hình
                    </button>

                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
                        aria-label="Đóng bảng điều khiển RPG"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden">
                {/* Sidebar Tables */}
                <div className="w-44 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
                    <div className="flex-grow overflow-y-auto custom-scrollbar py-2">
                        {data.tables && data.tables.map(table => {
                            const isActive = table.config.id === activeView;
                            return (
                                <div key={table.config.id} className="flex items-center group">
                                    <button
                                        onClick={() => setActiveView(table.config.id)}
                                        className={`flex-grow px-3 py-3 text-left text-sm font-medium transition-colors border-l-4 ${
                                            isActive 
                                            ? 'bg-slate-800 text-sky-400 border-sky-500' 
                                            : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                                        }`}
                                    >
                                        <div className="truncate">{table.config.name}</div>
                                        <div className="text-[10px] text-slate-600 font-normal mt-0.5">{table.data.rows.length} rows</div>
                                    </button>
                                    
                                    {/* Copy Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyTable(table); }}
                                        className="p-2 text-slate-600 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Sao chép bảng này"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Data Manager Button */}
                    <div className="p-2 border-t border-slate-800">
                        <button 
                            onClick={() => setActiveView('data_manager')}
                            className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                activeView === 'data_manager'
                                ? 'bg-sky-900/50 text-sky-400 border border-sky-500/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            Quản lý Dữ liệu
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow overflow-hidden bg-slate-900/50 flex flex-col relative">
                    {isSettingsView ? (
                        <DataManagerView database={data} onImport={handleUpdateDb} />
                    ) : activeTable ? (
                        <div className="flex flex-col h-full p-4 gap-4">
                            <div className="flex justify-between items-end border-b border-slate-700/50 pb-2 shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{activeTable.config.name}</h3>
                                    <p className="text-xs text-slate-400 italic max-w-lg truncate">{activeTable.config.description || 'Không có mô tả'}</p>
                                </div>
                            </div>
                            
                            <div className="flex-grow overflow-hidden border border-slate-700 rounded-lg">
                                <InteractiveListView table={activeTable} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 italic flex-col gap-2">
                            <span className="text-4xl">🗂️</span>
                            <span>Chọn bảng dữ liệu để chỉnh sửa</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
