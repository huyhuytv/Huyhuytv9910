
import React, { useState } from 'react';
import { UserPersonaManager } from './UserPersonaManager';
import { ApiSettings } from './ApiSettings';
import { SmartScanSettings } from './SmartScanSettings';
import { SmartContextSettings } from './SmartContextSettings'; 
import { TtsSettings } from './TtsSettings'; 
import { BackupRestoreSettings } from './BackupRestoreSettings'; 
// import { usePreset } from '../contexts/PresetContext'; // Removed

type ActiveSubTab = 'persona' | 'api' | 'smartscan' | 'context' | 'tts' | 'backup';

const SubTabButton: React.FC<{
  tabId: ActiveSubTab;
  currentTab: ActiveSubTab;
  onClick: (tabId: ActiveSubTab) => void;
  children: React.ReactNode;
}> = ({ tabId, currentTab, onClick, children }) => (
  <button
    role="tab"
    id={`settings-subtab-${tabId}`}
    aria-controls={`settings-subtabpanel-${tabId}`}
    aria-selected={currentTab === tabId}
    onClick={() => onClick(tabId)}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      currentTab === tabId
        ? 'bg-sky-600 text-white'
        : 'text-slate-300 bg-slate-700 hover:bg-slate-600'
    }`}
  >
    {children}
  </button>
);


export const SettingsTab: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('persona');
    // const { activePresetName, presets, updateActivePreset } = usePreset(); // Removed

    return (
        <div className="max-w-7xl mx-auto">
             <div role="tablist" aria-label="Settings sections" className="mb-6 flex justify-center">
                 <div className="p-1 bg-slate-800 rounded-lg flex space-x-1 border border-slate-700 flex-wrap justify-center gap-y-2">
                    <SubTabButton tabId="persona" currentTab={activeSubTab} onClick={setActiveSubTab}>Hồ sơ Người dùng</SubTabButton>
                    <SubTabButton tabId="api" currentTab={activeSubTab} onClick={setActiveSubTab}>Thiết lập API</SubTabButton>
                    <SubTabButton tabId="backup" currentTab={activeSubTab} onClick={setActiveSubTab}>Sao lưu & Khôi phục</SubTabButton>
                    <SubTabButton tabId="tts" currentTab={activeSubTab} onClick={setActiveSubTab}>Giọng nói (TTS)</SubTabButton>
                    <SubTabButton tabId="context" currentTab={activeSubTab} onClick={setActiveSubTab}>Ngữ cảnh & Bộ nhớ</SubTabButton>
                    <SubTabButton tabId="smartscan" currentTab={activeSubTab} onClick={setActiveSubTab}>Quét Thông Minh</SubTabButton>
                 </div>
            </div>
            
            <div
              id={`settings-subtabpanel-${activeSubTab}`}
              role="tabpanel"
              aria-labelledby={`settings-subtab-${activeSubTab}`}
              className="focus:outline-none"
              tabIndex={0}
            >
                {activeSubTab === 'persona' && <UserPersonaManager />}
                {activeSubTab === 'api' && <ApiSettings />}
                {activeSubTab === 'backup' && <BackupRestoreSettings />}
                {activeSubTab === 'tts' && (
                    <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                        <TtsSettings />
                    </div>
                )}
                {activeSubTab === 'smartscan' && (
                    <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
                        <SmartScanSettings />
                    </div>
                )}
                {activeSubTab === 'context' && (
                    <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg max-w-4xl mx-auto">
                        <SmartContextSettings />
                    </div>
                )}
            </div>
        </div>
    );
};
