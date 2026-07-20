import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENTRY = join(ROOT, 'dist', 'index.js');

type JsonRpc = {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string };
};

function send(proc: ReturnType<typeof spawn>, msg: JsonRpc) {
  proc.stdin?.write(`${JSON.stringify(msg)}\n`);
}

test('MCP stdio handshake lists 5 tools without ROUTARA_API_KEY', async () => {
  const proc = spawn(process.execPath, [ENTRY], {
    cwd: ROOT,
    env: (() => {
      const env = { ...process.env };
      delete env.ROUTARA_API_KEY;
      return env;
    })(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pending = new Map<number, { resolve: (v: JsonRpc) => void; reject: (e: Error) => void }>();
  let nextId = 1;

  const rl = createInterface({ input: proc.stdout! });
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line) as JsonRpc;
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)!.resolve(msg);
        pending.delete(msg.id);
      }
    } catch {
      /* ignore non-json noise */
    }
  });

  const call = (method: string, params?: Record<string, unknown>) =>
    new Promise<JsonRpc>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      send(proc, { jsonrpc: '2.0', id, method, params });
    });

  try {
    const init = await call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'handshake-test', version: '1.0.0' },
    });
    assert.ok(init.result, 'initialize should return result');

    send(proc, { jsonrpc: '2.0', method: 'notifications/initialized' });

    const listed = await call('tools/list', {});
    const tools = (listed.result as { tools?: Array<{ name: string; inputSchema?: { properties?: Record<string, unknown> } }> })?.tools ?? [];
    assert.equal(tools.length, 5, `expected 5 tools, got ${tools.length}: ${tools.map((t) => t.name).join(', ')}`);
    const names = new Set(tools.map((t) => t.name));
    for (const n of [
      'routara_list_models',
      'routara_chat',
      'routara_generate_image',
      'routara_generate_video',
      'routara_get_video_status',
    ]) {
      assert.ok(names.has(n), `missing tool ${n}`);
    }
    const chat = tools.find((tool) => tool.name === 'routara_chat');
    assert.ok(chat?.inputSchema?.properties?.messages, 'chat must expose multi-turn messages');
    assert.ok(chat?.inputSchema?.properties?.tools, 'chat must expose function tools');
    const image = tools.find((tool) => tool.name === 'routara_generate_image');
    assert.ok(image?.inputSchema?.properties?.image_url, 'image tool must expose reference images');
    const video = tools.find((tool) => tool.name === 'routara_generate_video');
    assert.ok(video?.inputSchema?.properties?.aspect_ratio, 'video tool must expose aspect ratio');
  } finally {
    proc.kill();
    await once(proc, 'exit');
    rl.close();
  }
});
