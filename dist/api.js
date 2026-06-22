const DEFAULT_BASE = 'https://api.routara.ai/v1';
export class RoutaraApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'RoutaraApiError';
    }
}
export class RoutaraClient {
    apiKey;
    baseUrl;
    constructor(opts) {
        this.apiKey = opts.apiKey;
        this.baseUrl = (opts.baseUrl ?? process.env.ROUTARA_API_BASE ?? DEFAULT_BASE).replace(/\/$/, '');
    }
    async request(method, path, body) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await res.text();
        let json = null;
        if (text) {
            try {
                json = JSON.parse(text);
            }
            catch {
                json = null;
            }
        }
        if (!res.ok) {
            const err = json?.error;
            throw new RoutaraApiError(err?.message ?? text.slice(0, 500) ?? `HTTP ${res.status}`, res.status, err?.code);
        }
        return (json ?? {});
    }
    listModels() {
        return this.request('GET', '/models');
    }
    chat(params) {
        return this.request('POST', '/chat/completions', {
            ...params,
            stream: false,
        });
    }
    generateImage(params) {
        return this.request('POST', '/images/generations', params);
    }
    generateVideo(params) {
        return this.request('POST', '/videos/generations', params);
    }
    getVideoTask(taskId) {
        return this.request('GET', `/videos/${encodeURIComponent(taskId)}`);
    }
}
export function resolveApiKey() {
    const key = process.env.ROUTARA_API_KEY?.trim();
    if (!key) {
        throw new Error('ROUTARA_API_KEY is required. Get your key at https://routara.ai/#auth');
    }
    return key;
}
