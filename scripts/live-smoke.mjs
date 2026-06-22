#!/usr/bin/env node
/**
 * Live smoke test for routara-mcp API client (no stdio MCP handshake).
 * Usage: ROUTARA_API_KEY=sk-or-v1-... node scripts/live-smoke.mjs
 */
import { RoutaraClient } from '../dist/api.js';

const key = process.env.ROUTARA_API_KEY?.trim();
if (!key) {
  console.error('Set ROUTARA_API_KEY');
  process.exit(1);
}

const client = new RoutaraClient({ apiKey: key });

console.log('=== list_models ===');
const models = await client.listModels();
console.log('count:', models.data?.length ?? 0, 'sample:', models.data?.slice(0, 3).map((m) => m.id));

console.log('=== chat ===');
const chat = await client.chat({
  model: 'alibaba-qwen-turbo',
  messages: [{ role: 'user', content: 'Say hi in one word' }],
  max_tokens: 8,
});
const content = chat.choices?.[0]?.message?.content;
console.log('reply:', content);

console.log('=== invalid key check (separate client) ===');
const bad = new RoutaraClient({ apiKey: 'sk-or-v1-bad' });
try {
  await bad.listModels();
  console.error('FAIL: expected 401');
  process.exit(1);
} catch (e) {
  console.log('401 ok:', e.message);
}

console.log('OK live-smoke passed');
