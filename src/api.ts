const DEFAULT_BASE = 'https://api.routara.ai/v1';

export type RoutaraClientOptions = {
  apiKey: string;
  baseUrl?: string;
};

export class RoutaraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'RoutaraApiError';
  }
}

export class RoutaraClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(opts: RoutaraClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? process.env.ROUTARA_API_BASE ?? DEFAULT_BASE).replace(/\/$/, '');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
      throw new RoutaraApiError(
        err?.message ?? text.slice(0, 500) ?? `HTTP ${res.status}`,
        res.status,
        err?.code,
      );
    }

    return (json ?? {}) as T;
  }

  listModels() {
    return this.request<{ data?: Array<{ id: string; owned_by?: string }> }>('GET', '/models');
  }

  chat(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
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
  }) {
    return this.request<Record<string, unknown>>('POST', '/images/generations', params);
  }

  generateVideo(params: {
    model: string;
    prompt: string;
    duration?: number;
  }) {
    return this.request<Record<string, unknown>>('POST', '/videos/generations', params);
  }

  getVideoTask(taskId: string) {
    return this.request<Record<string, unknown>>('GET', `/videos/${encodeURIComponent(taskId)}`);
  }
}

export function resolveApiKey(): string {
  const key = process.env.ROUTARA_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'ROUTARA_API_KEY is required. Get your key at https://routara.ai/#auth',
    );
  }
  return key;
}
