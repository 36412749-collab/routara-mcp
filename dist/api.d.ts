export type RoutaraClientOptions = {
    apiKey: string;
    baseUrl?: string;
};
export declare class RoutaraApiError extends Error {
    readonly status: number;
    readonly code?: string | undefined;
    constructor(message: string, status: number, code?: string | undefined);
}
export declare class RoutaraClient {
    private readonly apiKey;
    private readonly baseUrl;
    constructor(opts: RoutaraClientOptions);
    private request;
    listModels(): Promise<{
        data?: Array<{
            id: string;
            owned_by?: string;
        }>;
    }>;
    chat(params: {
        model: string;
        messages: Array<{
            role: string;
            content: string;
        }>;
        max_tokens?: number;
        temperature?: number;
        stream?: boolean;
    }): Promise<Record<string, unknown>>;
    generateImage(params: {
        model: string;
        prompt: string;
        n?: number;
        size?: string;
    }): Promise<Record<string, unknown>>;
    generateVideo(params: {
        model: string;
        prompt: string;
        duration?: number;
    }): Promise<Record<string, unknown>>;
    getVideoTask(taskId: string): Promise<Record<string, unknown>>;
}
export declare function resolveApiKey(): string;
