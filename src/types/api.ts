
// --- EXTERNAL API TYPES ---

export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    pricing: {
        prompt: string;
        completion: string;
    };
    context_length: number;
    architecture?: {
        modality?: string;
        tokenizer?: string;
        instruct_type?: string;
    };
    top_provider?: {
        max_completion_tokens?: number;
        is_moderated?: boolean;
    };
    per_request_limits?: any;
}
