const DEFAULT_BASE = 'https://api.routara.ai/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 10_000;

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

export class RoutaraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'RoutaraApiError';
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RoutaraClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(opts: RoutaraClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? process.env.ROUTARA_API_BASE ?? DEFAULT_BASE).replace(/\/$/, '');
    this.timeoutMs = opts.timeoutMs ?? positiveInteger(process.env.ROUTARA_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'routara-mcp/1.1.0',
        };
        if (body !== undefined) headers['Content-Type'] = 'application/json';

        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });

        const text = await res.text();
        let json: Record<string, unknown> | null = null;
        if (text) {
          try {
            json = JSON.parse(text) as Record<string, unknown>;
          } catch {
            json = null;
          }
        }

        if (!res.ok) {
          const err = json?.error as { message?: string; code?: string } | undefined;
          const requestId = res.headers.get('x-request-id') ?? undefined;
          const retryMs = retryAfterMs(res.headers.get('retry-after'));
          const apiError = new RoutaraApiError(
            err?.message || text.slice(0, 500) || `HTTP ${res.status}`,
            res.status,
            err?.code,
            requestId,
            retryMs === undefined ? undefined : retryMs / 1_000,
          );
          if (attempt < this.maxRetries && isRetryableStatus(res.status)) {
            await wait(Math.min(retryMs ?? 500 * 2 ** attempt, MAX_RETRY_DELAY_MS));
            continue;
          }
          throw apiError;
        }

        return (json ?? {}) as T;
      } catch (error) {
        lastError = error;
        if (error instanceof RoutaraApiError) throw error;
        if (attempt < this.maxRetries) {
          await wait(Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS));
          continue;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new RoutaraApiError(`Routara API request timed out after ${this.timeoutMs}ms`, 408, 'timeout');
        }
        throw new RoutaraApiError(
          error instanceof Error ? error.message : 'Routara API network error',
          0,
          'network_error',
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }

  listModels() {
    return this.request<{ data?: Array<{ id: string; owned_by?: string; [key: string]: unknown }> }>('GET', '/models');
  }

  chat(params: {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop?: string | string[];
    tools?: Array<Record<string, unknown>>;
    tool_choice?: unknown;
  }) {
    return this.request<Record<string, unknown>>('POST', '/chat/completions', {
      ...params,
      stream: false,
    });
  }

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
  }) {
    return this.request<Record<string, unknown>>('POST', '/images/generations', params);
  }

  generateVideo(params: {
    model: string;
    prompt: string;
    duration?: number;
    aspect_ratio?: string;
    image_url?: string;
    negative_prompt?: string;
    resolution?: string;
    fps?: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/videos/generations', params);
  }

  getVideoTask(taskId: string, model?: string) {
    const query = model ? `?model=${encodeURIComponent(model)}` : '';
    return this.request<Record<string, unknown>>('GET', `/videos/${encodeURIComponent(taskId)}${query}`);
  }
}

export function resolveApiKey(): string {
  const key = process.env.ROUTARA_API_KEY?.trim();
  if (!key) {
    throw new Error('ROUTARA_API_KEY is required. Get your key at https://routara.ai/#auth');
  }
  return key;
}
