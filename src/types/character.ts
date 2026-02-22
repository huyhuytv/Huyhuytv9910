
// --- CORE ENTITIES (Character, World, Identity) ---

import type { RPGDatabase } from './rpg';

export interface RegexScript {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings?: string[];
  placement?: number[];
  disabled: boolean;
  markdownOnly?: boolean;
  promptOnly?: boolean;
  runOnEdit?: boolean;
  substituteRegex?: number;
  minDepth?: number | null;
  maxDepth?: number | null;
}

export interface TavernHelperScript {
    type: 'script';
    value: {
        id: string;
        name: string;
        content: string;
        info?: string;
        buttons?: {name: string, visible: boolean}[];
        data?: Record<string, any>;
        enabled: boolean;
    };
}

export interface WorldInfoEntry {
  id?: number;
  uid?: string; // Critical for React Keys & State
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: 'before_char' | 'after_char' | string;
  use_regex?: boolean;
  extensions?: Record<string, any>;
  sticky?: number;
  cooldown?: number;
  __deleted?: boolean; // UI State flag
  source_lorebook?: string;
}

export interface CharacterBook {
  entries: WorldInfoEntry[];
  name?: string;
}

export interface CharacterCard {
  name: string;
  description: string;
  personality?: string;
  first_mes: string;
  mes_example: string;
  scenario?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  alternate_greetings?: string[];
  char_book?: CharacterBook;
  extensions?: {
    TavernHelper_scripts?: TavernHelperScript[];
    regex_scripts?: RegexScript[];
    [key: string]: any;
  };
  creator_notes?: string;
  creatorcomment?: string;
  char_persona?: string;
  group_only_greetings?: string[];
  attached_lorebooks?: string[];
  
  // --- MYTHIC ENGINE DATA ---
  rpg_data?: RPGDatabase;
  // --------------------------

  data?: any; // V3 Data
  spec?: string; // V3 Spec
  spec_version?: string; // V3 Spec Version
  create_date?: string;
  avatar?: string;
  [key: string]: any; // Allow dynamic fields
}

export interface Lorebook {
    name: string;
    book: CharacterBook;
}

export interface UserPersona {
    id: string;
    name: string;
    description: string;
    avatar?: string;
}

export interface CharacterInContext {
  card: CharacterCard;
  fileName: string;
  avatarUrl: string | null;
  avatarFile: File | null;
}
