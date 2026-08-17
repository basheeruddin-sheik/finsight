// Stamps dist/sw.js with a build-unique cache name so every deploy actually
// invalidates old cached assets. sw.js is a plain static file (public/ is
// copied verbatim by Vite) — its bytes never change between deploys unless
// something rewrites it, so browsers never noticed a new service worker to
// install and old caches were never cleared. Runs automatically after
// `npm run build` via the "postbuild" script hook.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const swPath = join(dir, '..', 'dist', 'sw.js');

const buildId = String(Date.now());
const src = readFileSync(swPath, 'utf8');
const stamped = src.replace(
  "const CACHE = 'finsight-' + (self.__BUILD_TIME__ || 'dev');",
  `const CACHE = 'finsight-${buildId}';`,
);

if (stamped === src) {
  throw new Error('stamp-sw: expected placeholder not found in dist/sw.js — check it still matches');
}

writeFileSync(swPath, stamped);
console.log(`stamp-sw: dist/sw.js cache versioned as finsight-${buildId}`);
