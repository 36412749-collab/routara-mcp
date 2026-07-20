#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(root, '.mcpb-build');
const output = join(root, 'routara-mcp.mcpb');

async function readJson(path) {
  return JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
}

await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, 'dist'), { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'index.ts')],
  outfile: join(stage, 'dist', 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
});

const manifest = await readJson(join(root, 'manifest.json'));
await writeFile(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(join(root, 'logo.png'), join(stage, 'logo.png'));
await cp(join(root, 'README.md'), join(stage, 'README.md'));
await cp(join(root, 'LICENSE'), join(stage, 'LICENSE'));

const packageJson = await readJson(join(root, 'package.json'));
await writeFile(join(stage, 'package.json'), `${JSON.stringify({
  name: packageJson.name,
  version: packageJson.version,
  type: 'module',
  private: true,
}, null, 2)}\n`);

async function collectFiles(directory, prefix = '') {
  const entries = {};
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, item.name);
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      Object.assign(entries, await collectFiles(absolute, relative));
    } else if (item.isFile()) {
      entries[relative] = new Uint8Array(await readFile(absolute));
    }
  }
  return entries;
}

await writeFile(output, zipSync(await collectFiles(stage), { level: 9 }));
await rm(stage, { recursive: true, force: true });
