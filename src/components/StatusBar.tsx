

import React from 'react';

interface StatusBarProps {
    characterFileName: string;
    presetFileName: string;
    personaName: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ characterFileName, presetFileName, personaName }) => {
    const items = [];
    if (characterFileName) {
        items.push({ label: "Nhân vật", value: characterFileName });
    }
    if (presetFileName) {
        items.push({ label: "Preset", value: presetFileName });
    }
    if (personaName) {
        items.push({ label: "Persona", value: personaName });
    }

    if (items.length === 0) {
        return null;
    }
    
    return (
        <dl className="bg-slate-800/50 p-2 rounded-lg mb-6 flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm">
           {items.map((item, index) => (
               <div key={item.label} className="flex items-center gap-2">
                   <dt className="font-semibold text-slate-400">{item.label}:</dt>
                   <dd className="bg-slate-700 text-sky-300 px-2 py-1 rounded-md font-mono text-xs truncate max-w-[200px] sm:max-w-xs">
                       {item.value}
                   </dd>
               </div>
           ))}
        </dl>
    );
};
