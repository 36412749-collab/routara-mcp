const DEFAULT_BASE = 'https://api.routara.ai/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 10_000;
export class RoutaraApiError extends Error {
    status;
    code;
    requestId;
    retryAfterSeconds;
    constructor(message, status, code, requestId, retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.requestId = requestId;
        this.retryAfterSeconds = retryAfterSeconds;
        this.name = 'RoutaraApiError';
    }
}
function positiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function retryAfterMs(value) {
    if (!value)
        return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0)
        return seconds * 1_000;
    const date = Date.parse(value);
    if (!Number.isNaN(date))
        return Math.max(0, date - Date.now());
    return undefined;
}
function isRetryableStatus(status) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export class RoutaraClient {
    apiKey;
    baseUrl;
    timeoutMs;
    maxRetries;
    constructor(opts) {
        this.apiKey = opts.apiKey;
        this.baseUrl = (opts.baseUrl ?? process.env.ROUTARA_API_BASE ?? DEFAULT_BASE).replace(/\/$/, '');
        this.timeoutMs = opts.timeoutMs ?? positiveInteger(process.env.ROUTARA_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
        this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    }
    async request(method, path, body) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const headers = {
                    Authorization: `Bearer ${this.apiKey}`,
                    Accept: 'application/json',
                    'User-Agent': 'routara-mcp/1.1.0',
                };
                if (body !== undefined)
                    headers['Content-Type'] = 'application/json';
                const res = await fetch(`${this.baseUrl}${path}`, {
                    method,
                    headers,
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal,
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
                    const requestId = res.headers.get('x-request-id') ?? undefined;
                    const retryMs = retryAfterMs(res.headers.get('retry-after'));
                    const apiError = new RoutaraApiError(err?.message || text.slice(0, 500) || `HTTP ${res.status}`, res.status, err?.code, requestId, retryMs === undefined ? undefined : retryMs / 1_000);
                    if (attempt < this.maxRetries && isRetryableStatus(res.status)) {
                        await wait(Math.min(retryMs ?? 500 * 2 ** attempt, MAX_RETRY_DELAY_MS));
                        continue;
                    }
                    throw apiError;
                }
                return (json ?? {});
            }
            catch (error) {
                lastError = error;
                if (error instanceof RoutaraApiError)
                    throw error;
                if (attempt < this.maxRetries) {
                    await wait(Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS));
                    continue;
                }
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new RoutaraApiError(`Routara API request timed out after ${this.timeoutMs}ms`, 408, 'timeout');
                }
                throw new RoutaraApiError(error instanceof Error ? error.message : 'Routara API network error', 0, 'network_error');
            }
            finally {
                clearTimeout(timeout);
            }
        }
        throw lastError;
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
    getVideoTask(taskId, model) {
        const query = model ? `?model=${encodeURIComponent(model)}` : '';
        return this.request('GET', `/videos/${encodeURIComponent(taskId)}${query}`);
    }
}
export function resolveApiKey() {
    const key = process.env.ROUTARA_API_KEY?.trim();
    if (!key) {
        throw new Error('ROUTARA_API_KEY is required. Get your key at https://routara.ai/#auth');
    }
    return key;
}
