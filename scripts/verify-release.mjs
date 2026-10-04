import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const registryManifest = JSON.parse(await readFile(join(root, 'server.json'), 'utf8'));
const bundlePath = join(root, 'routara-mcp.mcpb');
const files = unzipSync(new Uint8Array(await readFile(bundlePath)));
const bundleManifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
const entry = bundleManifest.server.entry_point;

assert.equal(packageJson.bin['routara-mcp'], 'dist/cli.js');
assert.ok(packageJson.files.includes('dist/cli.js'));
assert.equal(registryManifest.version, packageJson.version);
assert.equal(registryManifest.packages[0].version, packageJson.version);
assert.equal(bundleManifest.version, packageJson.version);
assert.equal(entry, 'dist/cli.js');
assert.equal(bundleManifest.server.mcp_config.args[0], '${__dirname}/dist/cli.js');
assert.ok(files[entry], `MCPB missing ${entry}`);
assert.ok(new TextDecoder().decode(files[entry].slice(0, 50)).startsWith('#!/usr/bin/env node\n'));

const stage = await mkdtemp(join(tmpdir(), 'routara-release-'));
let child;
try {
  for (const [relative, bytes] of Object.entries(files)) {
    const path = join(stage, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  const environment = { ...process.env };
  delete environment.ROUTARA_API_KEY;
  child = spawn(process.execPath, [join(stage, entry)], {
    cwd: stage,
    env: environment,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const responses = new Map();
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id !== undefined) {
        responses.get(response.id)?.(response);
      }
    } catch {
      // Ignore any non-protocol output; the timeout below reports failures.
    }
  });
  let nextId = 1;
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timeout = setTimeout(() => {
      responses.delete(id);
      reject(new Error(`${method} timed out: ${stderr.slice(-500)}`));
    }, 10_000);
    responses.set(id, (message) => {
      clearTimeout(timeout);
      responses.delete(id);
      resolve(message);
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
  const initialized = await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'release-check', version: '1.0.0' },
  });
  assert.ok(initialized.result, JSON.stringify(initialized.error ?? initialized));
  assert.equal(initialized.result.serverInfo.version, packageJson.version);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await call('tools/list', {});
  const names = listed.result?.tools?.map((tool) => tool.name) ?? [];
  assert.deepEqual(names.sort(), [
    'routara_chat',
    'routara_generate_image',
    'routara_generate_video',
    'routara_get_video_status',
    'routara_list_models',
  ]);
  lines.close();
  console.log(`MCPB ${packageJson.version}: handshake and 5 tools verified`);
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  await rm(stage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
