// copy-assets.mjs
// Copies the @3d-dice/dice-box runtime assets (physics WASM + dice theme) into
// public/ so the 3D dice work fully offline. Runs automatically on `npm install`
// (postinstall). Re-run manually with: node scripts/copy-assets.mjs

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'node_modules/@3d-dice/dice-box/dist/assets');
const DEST = resolve(ROOT, 'public/assets/dice-box');

if (!existsSync(SRC)) {
  console.warn('[copy-assets] dice-box assets not found at', SRC, '- skipping (run npm install first).');
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
cpSync(SRC, DEST, { recursive: true });
console.log('[copy-assets] dice-box assets copied ->', DEST);
