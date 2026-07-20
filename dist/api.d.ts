export type RoutaraClientOptions = {
    apiKey: string;
    baseUrl?: string;
    timeoutMs?: number;
    maxRetries?: number;
};
export type ChatMessage = {
    role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
    content: string | Array<Record<string, unknown>>;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<Record<string, unknown>>;
};
export declare class RoutaraApiError extends Error {
    readonly status: number;
    readonly code?: string | undefined;
    readonly requestId?: string | undefined;
    readonly retryAfterSeconds?: number | undefined;
    constructor(message: string, status: number, code?: string | undefined, requestId?: string | undefined, retryAfterSeconds?: number | undefined);
}
export declare class RoutaraClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    constructor(opts: RoutaraClientOptions);
    private request;
    listModels(): Promise<{
        data?: Array<{
            id: string;
            owned_by?: string;
            [key: string]: unknown;
        }>;
    }>;
    chat(params: {
        model: string;
        messages: ChatMessage[];
        max_tokens?: number;
        temperature?: number;
        top_p?: number;
        stop?: string | string[];
        tools?: Array<Record<string, unknown>>;
        tool_choice?: unknown;
    }): Promise<Record<string, unknown>>;
    generateImage(params: {
        model: string;
        prompt: string;
        n?: number;
        size?: string;
        quality?: string;
        response_format?: 'url' | 'b64_json';
        aspect_ratio?: string;
        image_url?: string;
        negative_prompt?: string;
        seed?: number;
        style?: string;
    }): Promise<Record<string, unknown>>;
    generateVideo(params: {
        model: string;
        prompt: string;
        duration?: number;
        aspect_ratio?: string;
        image_url?: string;
        negative_prompt?: string;
        resolution?: string;
        fps?: number;
    }): Promise<Record<string, unknown>>;
    getVideoTask(taskId: string, model?: string): Promise<Record<string, unknown>>;
}
export declare function resolveApiKey(): string;
