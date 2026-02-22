
import type { WorldInfoEntry, WorldInfoRuntimeStats } from '../types';

/**
 * Converts a pattern string into a RegExp object.
 * Supports SillyTavern style "/pattern/flags" (e.g., "/hero/i") or raw strings.
 * Defaults to case-insensitive ('i') if no flags provided for raw strings.
 */
const stringToRegex = (pattern: string): RegExp | null => {
    if (!pattern) return null;
    try {
        // Check for /pattern/flags syntax
        const match = pattern.match(/^\/(.*?)\/([gimsuy]*)$/);
        if (match) {
            return new RegExp(match[1], match[2]);
        }
        // Default behavior for raw strings in Regex mode: Case insensitive
        return new RegExp(pattern, 'i');
    } catch (e) {
        console.warn(`[WorldInfoScanner] Invalid Regex: ${pattern}`, e);
        return null;
    }
};

/**
 * Checks if a single key matches the text.
 * Handles both Regex mode and Standard Keyword logic (AND '&', NOT '!').
 */
const checkKeyMatch = (key: string, text: string, useRegex: boolean): boolean => {
    if (!key || !text) return false;

    if (useRegex) {
        const regex = stringToRegex(key);
        if (!regex) return false;
        return regex.test(text);
    } else {
        // Standard Keyword Logic
        // Example: "dragon & fire & !ice"
        // Meaning: Must contain "dragon", must contain "fire", must NOT contain "ice"
        const parts = key.split('&').map(k => k.trim());
        const textLower = text.toLowerCase();

        for (const part of parts) {
            if (!part) continue;
            
            if (part.startsWith('!')) {
                // NOT logic: If text contains the forbidden word, fail immediately
                const negativeKeyword = part.substring(1).trim().toLowerCase();
                if (negativeKeyword && textLower.includes(negativeKeyword)) {
                    return false;
                }
            } else {
                // AND logic: If text does NOT contain the required word, fail immediately
                const positiveKeyword = part.toLowerCase();
                if (positiveKeyword && !textLower.includes(positiveKeyword)) {
                    return false; 
                }
            }
        }
        // If we passed all checks for this key string, it's a match
        return true;
    }
};

/**
 * Scans text against a list of World Info entries.
 * Implements V3 Logic & Live-Link Lifecycle (Auto-Prune):
 * 1. Check Constant/Enabled/Cooldown.
 * 2. Live-Link Lifecycle: Prune if inactive > 10 turns, unless woken by Smart Scan or Keyword.
 * 3. Primary Keys: OR logic (at least one must match).
 * 4. Secondary Keys: If present, OR logic (at least one must match).
 * 
 * UPDATE (Smart Scan & Keep-Alive):
 * - AI Override: If AI selects an entry, it bypasses dormancy check.
 * - Keep-Alive: If matched (by AI or Keyword), it gets added to touchedUids for timestamp refresh.
 */
const scanEntries = (
    text: string, 
    entries: WorldInfoEntry[], 
    manualState: Record<string, boolean> = {},
    runtimeState: Record<string, WorldInfoRuntimeStats> = {},
    currentTurn: number = 0,
    aiActiveUids: Set<string> = new Set(),
    keywordEnabled: boolean = true // NEW PARAMETER: Controls whether keyword matching runs
): { matchedEntries: WorldInfoEntry[], touchedUids: Set<string> } => {
    
    const matchedEntries: WorldInfoEntry[] = [];
    const touchedUids = new Set<string>(); // IDs that were interacted with (for updating lastActiveTurn)

    for (const entry of entries) {
        if (!entry.uid) continue;
        
        // 1. Check Enabled State (Manual Override > Card Default)
        const isEnabled = manualState[entry.uid] !== undefined
            ? manualState[entry.uid]
            : entry.enabled !== false;

        if (!isEnabled) continue;

        const stats = runtimeState[entry.uid] || { stickyDuration: 0, cooldownDuration: 0, lastActiveTurn: undefined };

        // [LOGIC #4 - AI OVERRIDE]
        // Check if AI explicitly selected this entry
        const isAiSelected = aiActiveUids.has(entry.uid);

        // 2. Check Runtime Cooldown (Updated Logic: AI Override Cooldown)
        // If AI selected it, we ignore cooldown. If purely keyword, we respect cooldown.
        if (!isAiSelected && stats.cooldownDuration > 0) continue;

        // 3. Constant entries always match immediately
        if (entry.constant) {
            matchedEntries.push(entry);
            continue;
        }

        // --- LIVE-LINK LIFECYCLE LOGIC (Auto-Prune) ---
        const isLiveLink = entry.uid.startsWith('mythic_');
        let isDormant = false;

        if (isLiveLink) {
            // If lastActiveTurn is undefined, it's considered new/fresh (Active)
            const lastActive = stats.lastActiveTurn !== undefined ? stats.lastActiveTurn : currentTurn;
            const inactivityAge = currentTurn - lastActive;
            
            // Only consider it dormant if age > 10 AND AI didn't just select it
            if (inactivityAge > 10 && !isAiSelected) {
                isDormant = true;
            }
        }

        // [LOGIC CHECK]
        // Triggers that can wake up or maintain an entry:
        // A. AI Smart Scan (isAiSelected) -> Already handled in dormancy check above (forces isDormant = false)
        // B. Keyword Match (Only if keywordEnabled is true)
        
        let isKeywordMatched = false;
        
        // Only run keyword logic if enabled for this scan
        if (keywordEnabled) {
            const hasPrimaryKeys = entry.keys && entry.keys.length > 0;
            
            if (hasPrimaryKeys) {
                for (const keyStr of entry.keys) {
                    if (checkKeyMatch(keyStr, text, !!entry.use_regex)) {
                        isKeywordMatched = true;
                        break; 
                    }
                }
            }
        }

        // Logic Decision:
        // - If Dormant: Skip (Pruned), unless isAiSelected (which forced isDormant=false)
        // - If Not Dormant: Include if (AI Selected OR Keyword Match)
        
        let shouldInclude = false;

        if (isAiSelected) {
            shouldInclude = true; // AI overrides everything
        } else if (isKeywordMatched) {
            // Check secondary keys if primary matched
            const hasSecondaryKeys = entry.secondary_keys && entry.secondary_keys.length > 0;
            let secondaryMatch = true; 

            if (hasSecondaryKeys) {
                secondaryMatch = false; 
                for (const keyStr of entry.secondary_keys!) {
                    if (checkKeyMatch(keyStr, text, !!entry.use_regex)) {
                        secondaryMatch = true;
                        break;
                    }
                }
            }
            if (secondaryMatch && !isDormant) {
                shouldInclude = true;
            }
        }

        if (shouldInclude) {
            matchedEntries.push(entry);
            // [LOGIC #1 - KEEP-ALIVE PULSE]
            // Mark as touched to update timestamp, ensuring it stays alive for next turns
            touchedUids.add(entry.uid);
        }
    }

    return { matchedEntries, touchedUids };
};

/**
 * Helper to prepare lorebook data payload for AI Smart Scan.
 * Truncates content based on strategy.
 * Splits into 'contextString' (Constants) and 'candidateString' (Candidates).
 */
export const prepareLorebookForAI = (
    entries: WorldInfoEntry[], 
    currentTurn: number, 
    runtimeState: Record<string, WorldInfoRuntimeStats>,
    strategy: 'efficient' | 'full' = 'efficient' // Added strategy param
): { contextString: string, candidateString: string } => {
    const contextParts: string[] = [];
    const candidateParts: string[] = [];

    entries.forEach(entry => {
        if (!entry.uid || entry.enabled === false) return;

        let content = entry.content || '';
        
        if (strategy === 'efficient') {
            // EFFICIENT MODE: Truncate at 400 chars to save tokens
            if (content.length > 400) {
                content = content.slice(0, 300) + "\n... (đã lược bỏ) ...\n" + content.slice(-100);
            }
        } else {
            // FULL MODE: High Accuracy
            // Still enforce a safety limit to prevent browser/API crash on massive entries
            const SAFETY_LIMIT = 20000;
            if (content.length > SAFETY_LIMIT) {
                content = content.slice(0, SAFETY_LIMIT) + "\n... (đã lược bỏ vì quá lớn > 20k) ...";
            }
        }
        
        content = content.replace(/\n/g, ' ');
        
        // Determine status for AI context
        let statusTag = "";
        if (entry.uid.startsWith('mythic_')) {
            const stats = runtimeState[entry.uid];
            const lastActive = stats?.lastActiveTurn !== undefined ? stats.lastActiveTurn : currentTurn; // Default new ones to active
            const age = currentTurn - lastActive;
            if (age > 10) statusTag = " [DORMANT/NGỦ ĐÔNG]";
            else statusTag = " [ACTIVE]";
        }

        const formattedEntry = `[${entry.constant ? 'Hằng số' : 'ID: ' + entry.uid}${statusTag}]
- Tên: ${entry.comment || 'Không tên'}
- Từ khóa: ${(entry.keys || []).join(', ')}
- Nội dung: "${content}"`;

        if (entry.constant) {
            contextParts.push(formattedEntry);
        } else {
            candidateParts.push(formattedEntry);
        }
    });

    return {
        contextString: contextParts.join('\n\n'),
        candidateString: candidateParts.join('\n\n')
    };
};

/**
 * Main Recursive Scanner
 */
export const performWorldInfoScan = (
    textToScan: string,
    allEntries: WorldInfoEntry[],
    manualState: Record<string, boolean>,
    currentRuntimeState: Record<string, WorldInfoRuntimeStats>,
    pinnedState: Record<string, boolean> = {},
    aiActiveUids: string[] = [], 
    bypassKeywordScan: boolean = false,
    currentTurn: number = 0, // Lifecycle Tracking
    aiStickyDuration: number = 0 // NEW: Global Override for AI triggered entries
): { activeEntries: WorldInfoEntry[]; updatedRuntimeState: Record<string, WorldInfoRuntimeStats> } => {
    
    const MAX_DEPTH = 2;
    let currentDepth = 0;
    
    const activeUidSet = new Set<string>();
    const touchedUidSet = new Set<string>(); // UIDs that need timestamp update
    const aiUidSet = new Set(aiActiveUids);

    // 1. Initial Scan Setup
    
    // A. Constants
    // BUG FIX: Check strict enabled status. Manual Toggle overrides Card Default.
    const constantEntries = allEntries.filter(e => {
        if (!e.constant || !e.uid) return false;
        // Priority: Manual Toggle in Chat > Card Default Enabled State
        if (manualState[e.uid] !== undefined) {
            return manualState[e.uid];
        }
        return e.enabled !== false;
    });
    constantEntries.forEach(e => activeUidSet.add(e.uid!));
    
    // B. Pinned
    const pinnedEntries = allEntries.filter(e => e.uid && pinnedState[e.uid] && manualState[e.uid!] !== false);
    pinnedEntries.forEach(e => activeUidSet.add(e.uid!));

    // C. Sticky (Classic)
    for (const uid in currentRuntimeState) {
        if (currentRuntimeState[uid].stickyDuration > 0) {
            activeUidSet.add(uid);
        }
    }
    
    // D. AI-Activated
    // Note: We delegate the actual inclusion logic to scanEntries so it handles touchedUids correctly.
    // However, for pure AI selection without keyword scan (ai_only mode), we ensure they are added here.
    aiActiveUids.forEach(uid => {
        if (manualState[uid] !== false) {
            // AI selections are automatically considered "Touched"
            touchedUidSet.add(uid);
        }
    });

    // E. Keyword Scan + Lifecycle Check
    // We run the loop even if bypassKeywordScan is true, to process AI active items (recursively if needed)
    // AND to handle the Lifecycle pruning via scanEntries
    if (!bypassKeywordScan || aiActiveUids.length > 0) {
        let textBuffer = textToScan;
        
        while (currentDepth <= MAX_DEPTH) {
            const { matchedEntries, touchedUids: scanTouched } = scanEntries(
                textBuffer, 
                allEntries, 
                manualState, 
                currentRuntimeState,
                currentTurn,
                aiUidSet,
                !bypassKeywordScan // Pass keywordEnabled flag: False if bypassing
            );
            
            let hasNew = false;
            let newContent = '';

            for (const entry of matchedEntries) {
                if (!entry.uid) continue;
                
                // Track touched (interacted) entries for Keep-Alive Pulse
                if (scanTouched.has(entry.uid)) {
                    touchedUidSet.add(entry.uid);
                }

                if (!activeUidSet.has(entry.uid)) {
                    activeUidSet.add(entry.uid);
                    hasNew = true;
                    newContent += '\n' + entry.content;
                }
            }

            if (!hasNew) break;
            textBuffer = newContent;
            currentDepth++;
        }
    }

    // 2. Update Runtime State
    const nextRuntimeState: Record<string, WorldInfoRuntimeStats> = {};

    // Clone existing state
    for (const uid in currentRuntimeState) {
        nextRuntimeState[uid] = { ...currentRuntimeState[uid] };
        // Decrement counters
        nextRuntimeState[uid].stickyDuration = Math.max(0, nextRuntimeState[uid].stickyDuration - 1);
        nextRuntimeState[uid].cooldownDuration = Math.max(0, nextRuntimeState[uid].cooldownDuration - 1);
    }

    // Process active entries
    const activeEntries = allEntries.filter(e => e.uid && activeUidSet.has(e.uid));
    
    for (const entry of activeEntries) {
        if (!entry.uid) continue;

        // Initialize state if missing
        if (!nextRuntimeState[entry.uid]) {
            nextRuntimeState[entry.uid] = { stickyDuration: 0, cooldownDuration: 0, lastActiveTurn: currentTurn };
        }

        // [LOGIC #1 - KEEP-ALIVE PULSE APPLICATION]
        // If entry was Touched (via AI selection or Keyword Match), update its timestamp to NOW.
        // This resets the 10-turn death timer.
        if (touchedUidSet.has(entry.uid)) {
            nextRuntimeState[entry.uid].lastActiveTurn = currentTurn;
        }

        // [LOGIC #2 - STICKY APPLICATION WITH AI OVERRIDE]
        // Determine base sticky from card
        const cardSticky = entry.sticky && entry.sticky > 0 ? entry.sticky : 0;
        
        let finalSticky = cardSticky;

        // If triggered by AI, apply Max Safe logic: Max(Card, App)
        // Note: aiStickyDuration comes from Global Settings passed into this function
        if (aiUidSet.has(entry.uid) && aiStickyDuration > 0) {
            finalSticky = Math.max(cardSticky, aiStickyDuration);
        }

        // Only apply if greater than current remaining duration to extend it
        if (finalSticky > 0) {
             // Logic: Refresh sticky duration to max if triggered this turn
             // We only set it if it was touched this turn
             if (touchedUidSet.has(entry.uid)) {
                 nextRuntimeState[entry.uid].stickyDuration = Math.max(nextRuntimeState[entry.uid].stickyDuration, finalSticky);
             }
        }
        
        // Cooldown application (Standard)
        if (entry.cooldown && entry.cooldown > 0) {
             nextRuntimeState[entry.uid].cooldownDuration = entry.cooldown;
        }
    }

    // Sort active entries
    activeEntries.sort((a, b) => (a.insertion_order || 0) - (b.insertion_order || 0));

    return {
        activeEntries,
        updatedRuntimeState: nextRuntimeState
    };
};
