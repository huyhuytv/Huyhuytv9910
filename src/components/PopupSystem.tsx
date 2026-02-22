
import React, { createContext, useContext, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';

interface PopupContextType {
  showPopup: (content: string, title?: string) => void;
  closePopup: () => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) throw new Error('usePopup must be used within a PopupProvider');
  return context;
};

export const PopupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [title, setTitle] = useState('');

  const showPopup = useCallback((content: string, popupTitle: string = 'Thông báo Thẻ') => {
    // Basic sanitization, but allow style tags for card formatting
    const sanitized = DOMPurify.sanitize(content, {
        ADD_TAGS: ['style', 'img', 'div', 'span', 'p', 'br', 'b', 'i', 'strong', 'em', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'hr'],
        ADD_ATTR: ['style', 'class', 'src', 'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing']
    });
    setHtmlContent(sanitized);
    setTitle(popupTitle);
    setIsOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setHtmlContent('');
  }, []);

  return (
    <PopupContext.Provider value={{ showPopup, closePopup }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={closePopup}>
          <div 
            className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-bold text-sky-400">{title}</h3>
                <button 
                    onClick={closePopup} 
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                    aria-label="Đóng popup"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-800 text-slate-200 popup-content">
                 <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
            <div className="p-3 border-t border-slate-700 bg-slate-900/30 flex justify-end">
                <button onClick={closePopup} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Đóng
                </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .popup-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
        .popup-content th, .popup-content td { border: 1px solid #475569; padding: 8px; }
        .popup-content th { background-color: #1e293b; color: #e2e8f0; }
        .popup-content img { max-width: 100%; height: auto; border-radius: 4px; }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </PopupContext.Provider>
  );
};
