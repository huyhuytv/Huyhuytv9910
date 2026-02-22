

import React from 'react';

interface TooltipProps {
  text?: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  if (!text) {
    return <>{children}</>;
  }

  return (
    <div className="relative group flex items-center">
      {children}
      <div 
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3
                      bg-slate-900 text-slate-200 text-xs font-medium rounded-md shadow-lg border border-slate-700
                      opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none z-20"
      >
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                        border-x-4 border-x-transparent
                        border-t-4 border-t-slate-700" aria-hidden="true"></div>
      </div>
    </div>
  );
};
