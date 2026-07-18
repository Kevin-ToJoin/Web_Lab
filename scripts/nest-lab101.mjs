// Vite's `base: '/Lab101/'` only rewrites the asset URLs *referenced inside*
// index.html — it does not change where files land on disk. Since this app is
// deployed behind tojoin.org/Lab101 via a Vercel rewrite that forwards the
// full request path (e.g. /Lab101/assets/index-abc123.js) to this project,
// the build output must physically live under dist/Lab101/ too.
//
// This script moves the flat `dist/` output into `dist/Lab101/` and drops a
// tiny root `dist/index.html` that redirects "/" to "/Lab101/" so visiting
// this project's own *.vercel.app domain directly also works.
import { mkdir, readdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(import.meta.dirname, '..', 'dist');
const nestedDir = path.join(distDir, 'Lab101');

if (!existsSync(distDir)) {
  throw new Error(`dist/ not found at ${distDir} — run "vite build" first.`);
}

const entries = await readdir(distDir);
await mkdir(nestedDir, { recursive: true });

for (const entry of entries) {
  await rename(path.join(distDir, entry), path.join(nestedDir, entry));
}

await writeFile(
  path.join(distDir, 'index.html'),
  '<!doctype html><meta http-equiv="refresh" content="0; url=/Lab101/">' +
    '<a href="/Lab101/">Continue to TestLab 101</a>',
);

console.log('Nested build output under dist/Lab101/ and added a root redirect.');
