/**
 * watch-mixes.mjs
 * Watches public/mixes/ for added or removed files and triggers a rebuild
 * so the main site at agustin-sanchez.com/plastic-palms-radio stays in sync.
 *
 * Usage: npm run watch
 */

import { watch } from 'node:fs';
import { exec }  from 'node:child_process';
import path      from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mixesDir  = path.join(__dirname, 'public/mixes');

console.log('Plastic Palms Radio — watching for new mixes...');
console.log(`Source: ${mixesDir}\n`);

let building     = false;
let pendingBuild = false;

function build() {
  if (building) { pendingBuild = true; return; }
  building = true;
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] Change detected — rebuilding...`);

  exec('npm run build', { cwd: __dirname }, (err, stdout, stderr) => {
    building = false;
    const ts2 = new Date().toLocaleTimeString();
    if (err) {
      console.error(`[${ts2}] Build failed:\n`, stderr);
    } else {
      console.log(`[${ts2}] Build complete — site updated.`);
    }
    if (pendingBuild) { pendingBuild = false; build(); }
  });
}

watch(mixesDir, { recursive: false }, (event, filename) => {
  if (!filename || filename.startsWith('.')) return;
  // Only react to audio or image files
  if (!/\.(mp3|jpg|jpeg|png|webp)$/i.test(filename)) return;
  build();
});
