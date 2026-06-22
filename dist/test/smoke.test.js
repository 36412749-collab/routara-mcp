import assert from 'node:assert/strict';
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
