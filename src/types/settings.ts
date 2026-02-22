
// --- CONFIGURATION & PRESETS ---

export interface PromptEntry {
    name: string;
    content: string;
    enabled: boolean;
    role?: 'system' | 'user' | 'assistant';
    identifier?: string;
    include_title?: boolean;
    order?: number;
    injection_order?: number; // Support for V3 ordering
}

export interface SillyTavernPreset {
  name: string;
  comment: string;
  
  // Core Sampling
  temp: number | string;
  top_p: number | string;
  top_k: number | string;
  typical_p: number | string;
  
  // Advanced Sampling
  tfs: number | string;
  top_a: number | string;
  min_p: number | string;
  epsilon_cutoff: number | string;
  eta_ddim: number | string;
  
  // Repetition Penalty
  repetition_penalty: number | string;
  repetition_penalty_range: number | string;
  encoder_repetition_penalty: number | string;
  no_repeat_ngram_size: number | string;
  
  // Advanced Penalty
  frequency_penalty: number | string;
  presence_penalty: number | string;
  
  // Mirostat Sampling
  mirostat_mode: number;
  mirostat_tau: number | string;
  mirostat_eta: number | string;
  
  // Generation Control
  min_length: number | string;
  max_tokens: number | string; 
  n: number | string; 
  do_sample: boolean;
  seed: number | string;
  ban_eos_token: boolean;
  add_bos_token: boolean;
  truncation_length: number | string;
  
  // Stopping Strings
  stopping_strings: string[];
  custom_stopping_strings: string[];
  
  // Instruct Mode
  system_prompt?: string;
  instruct_template?: string;
  
  // Prompts Array
  prompts?: PromptEntry[];
  
  // Streaming Config
  stream_response?: boolean;

  // Thinking Config (Gemini 2.5+)
  thinking_budget?: number;

  // Prompt Formatting
  wi_format?: string;
  scenario_format?: string;
  personality_format?: string;
  custom_prompt_post_processing?: string;
  
  // Chat Behavior
  wrap_in_quotes?: boolean;
  squash_system_messages?: boolean;
  bypass_status_check?: boolean;
  max_context_unlocked?: boolean;
  new_chat_prompt?: string;
  continue_nudge_prompt?: string;

  // Extensions & Dynamic
  extensions?: Record<string, any>;
  [key: string]: any;
}
