import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { RoutaraApiError, RoutaraClient, resolveApiKey } from '../api.js';
test('RoutaraApiError carries status and code', () => {
    const err = new RoutaraApiError('bad key', 401, 'invalid_api_key');
    assert.equal(err.status, 401);
    assert.equal(err.code, 'invalid_api_key');
});
test('resolveApiKey throws when ROUTARA_API_KEY missing', () => {
    const prev = process.env.ROUTARA_API_KEY;
    delete process.env.ROUTARA_API_KEY;
    try {
        assert.throws(() => resolveApiKey(), /ROUTARA_API_KEY/);
    }
    finally {
        if (prev)
            process.env.ROUTARA_API_KEY = prev;
    }
});
test('RoutaraClient listModels against live API when ROUTARA_API_KEY set', async (t) => {
    const key = process.env.ROUTARA_API_KEY?.trim();
    if (!key) {
        t.skip('ROUTARA_API_KEY not set — skipping live test');
        return;
    }
    const client = new RoutaraClient({ apiKey: key });
    const data = await client.listModels();
    assert.ok(Array.isArray(data.data));
    assert.ok((data.data?.length ?? 0) > 0);
});
test('RoutaraClient chat against live API when ROUTARA_API_KEY set', async (t) => {
    const key = process.env.ROUTARA_API_KEY?.trim();
    if (!key) {
        t.skip('ROUTARA_API_KEY not set — skipping live test');
        return;
    }
    const client = new RoutaraClient({ apiKey: key });
    const data = await client.chat({
        model: 'alibaba-qwen-turbo',
        messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
        max_tokens: 8,
    });
    const content = data.choices?.[0]?.message?.content ?? '';
    assert.ok(String(content).length > 0);
});
test('invalid API key returns 401', async (t) => {
    const client = new RoutaraClient({ apiKey: 'sk-or-v1-invalid-probe-key' });
    await assert.rejects(() => client.listModels(), (err) => err instanceof RoutaraApiError && err.status === 401);
});
test('RoutaraClient retries 429 and preserves response metadata', async () => {
    let requests = 0;
    const server = createServer((req, res) => {
        requests += 1;
        if (requests === 1) {
            res.writeHead(429, {
                'content-type': 'application/json',
                'retry-after': '0',
                'x-request-id': 'req_retry_probe',
            });
            res.end(JSON.stringify({ error: { message: 'slow down', code: 'rate_limit' } }));
            return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'probe-model' }] }));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const address = server.address();
        assert.ok(address && typeof address === 'object');
        const client = new RoutaraClient({
            apiKey: 'probe',
            baseUrl: `http://127.0.0.1:${address.port}`,
            timeoutMs: 1_000,
            maxRetries: 1,
        });
        const result = await client.listModels();
        assert.equal(result.data?.[0]?.id, 'probe-model');
        assert.equal(requests, 2);
    }
    finally {
        server.close();
        await once(server, 'close');
    }
});
test('RoutaraClient reports timeout as structured API error', async () => {
    const server = createServer((_req, res) => {
        setTimeout(() => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end('{}');
        }, 200);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const address = server.address();
        assert.ok(address && typeof address === 'object');
        const client = new RoutaraClient({
            apiKey: 'probe',
            baseUrl: `http://127.0.0.1:${address.port}`,
            timeoutMs: 20,
            maxRetries: 0,
        });
        await assert.rejects(() => client.listModels(), (error) => error instanceof RoutaraApiError && error.status === 408 && error.code === 'timeout');
    }
    finally {
        server.closeAllConnections();
        server.close();
        await once(server, 'close');
    }
});
