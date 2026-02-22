
import React, { useEffect, useRef } from 'react';
import type { VisualState } from '../../types';

interface VisualLayerProps {
    visualState: VisualState;
    isImmersive: boolean;
}

export const VisualLayer: React.FC<VisualLayerProps> = ({ visualState, isImmersive }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio Player Logic
    useEffect(() => {
        if (!audioRef.current) return;
        
        if (visualState?.musicUrl && visualState.musicUrl !== 'off') {
             audioRef.current.src = visualState.musicUrl;
             audioRef.current.loop = true;
             audioRef.current.play().catch(e => console.error("Audio play error:", e));
        } else {
             audioRef.current.pause();
             audioRef.current.currentTime = 0;
        }
    }, [visualState?.musicUrl]);
    
    // Ambient Sound Logic
    useEffect(() => {
        if (visualState?.ambientSoundUrl) {
            const sfx = new Audio(visualState.ambientSoundUrl);
            sfx.play().catch(e => console.error("SFX play error:", e));
        }
    }, [visualState?.ambientSoundUrl]);

    return (
        <>
            {/* Dynamic Background Layer */}
            {visualState?.backgroundImage && (
                <div 
                    className="absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none"
                    style={{
                        backgroundImage: `url(${visualState.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: isImmersive ? 0.6 : 0.3 // More vivid in immersive mode
                    }}
                />
            )}
            {/* Immersive Vignette Overlay */}
            {isImmersive && (
                 <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80" />
            )}
            
            <audio ref={audioRef} className="hidden" />
        </>
    );
};
