
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CharacterTab } from './components/CharacterTab';
import { PresetTab } from './components/PresetTab';
import { LorebookTab } from './components/LorebookTab';
import { SettingsTab } from './components/SettingsTab';
import { ChatTab } from './components/ChatTab';
import { CharacterProvider } from './contexts/CharacterContext';
import { PresetProvider } from './contexts/PresetContext';
import { LorebookProvider } from './contexts/LorebookContext';
import { UserPersonaProvider } from './contexts/UserPersonaContext';
import { ToastProvider } from './components/ToastSystem';
import { PopupProvider } from './components/PopupSystem';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { initGlobalErrorHandling } from './services/globalErrorLogger';
import { TTSProvider } from './contexts/TTSContext';

// Initialize global error listeners immediately
initGlobalErrorHandling();

type ActiveTab = 'preset' | 'character' | 'lorebook' | 'chat' | 'settings';

const TabButton: React.FC<{
  tabId: ActiveTab;
  currentTab: ActiveTab;
  onClick: (tabId: ActiveTab) => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ tabId, currentTab, onClick, disabled = false, children }) => (
  <button
    role="tab"
    aria-selected={currentTab === tabId}
    aria-controls={`tabpanel-${tabId}`}
    id={`tab-${tabId}`}
    onClick={() => !disabled && onClick(tabId)}
    disabled={disabled}
    className={`px-4 py-2 text-sm md:text-base font-medium rounded-t-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
      currentTab === tabId
        ? 'bg-slate-800 border-b-2 border-sky-400 text-sky-400'
        : 'text-slate-400 hover:text-white'
    } ${disabled ? 'cursor-not-allowed text-slate-600' : ''}`}
  >
    {children}
  </button>
);

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('character');
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);

  const renderActiveTab = () => {
    switch(activeTab) {
      case 'character':
        return <CharacterTab />;
      case 'preset':
        return <PresetTab />;
      case 'lorebook':
        return <LorebookTab />;
      case 'chat':
        return <ChatTab 
                  activeSessionId={activeChatSessionId} 
                  onSessionSelect={setActiveChatSessionId} 
                  onCloseSession={() => setActiveChatSessionId(null)}
                />;
      case 'settings':
        return <SettingsTab />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col">
      <Header />
      <main className={`container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col flex-grow`}>
        <div className="border-b border-slate-700 mb-6">
            <nav role="tablist" className="flex space-x-2" aria-label="Main navigation tabs">
                <TabButton tabId="character" currentTab={activeTab} onClick={setActiveTab}>Nhân vật</TabButton>
                <TabButton tabId="preset" currentTab={activeTab} onClick={setActiveTab}>Preset</TabButton>
                <TabButton tabId="lorebook" currentTab={activeTab} onClick={setActiveTab}>Sổ tay Thế giới</TabButton>
                <TabButton tabId="chat" currentTab={activeTab} onClick={setActiveTab}>Trò chuyện</TabButton>
                <TabButton tabId="settings" currentTab={activeTab} onClick={setActiveTab}>Cài đặt</TabButton>
            </nav>
        </div>
        
        <div 
          role="tabpanel" 
          id={`tabpanel-${activeTab}`} 
          aria-labelledby={`tab-${activeTab}`}
          className="flex-grow flex flex-col focus:outline-none"
          tabIndex={0}
        >
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <TTSProvider>
          <PopupProvider>
            <LorebookProvider>
              <CharacterProvider>
                <PresetProvider>
                  <UserPersonaProvider>
                    <AppContent />
                  </UserPersonaProvider>
                </PresetProvider>
              </CharacterProvider>
            </LorebookProvider>
          </PopupProvider>
        </TTSProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
