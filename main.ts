// PUERTO DEL SOL — make.fun gta6-01 entry program (Node 22, standard library only).
// (Revised in-session from the v4 SOLMAR BAY entry: the game was renamed
// PUERTO DEL SOL at Reza's pick, the HUD rebuilt icon-first, the
// rectangle artifact killed, and the streets and districts filled in.
// The program itself is unchanged in behaviour — same caps, same checks.)
//
// This program hands the game in. It runs twice in a fresh container with no
// network, a read-only copy of this repository at /bot and a writable /output,
// on 1 CPU, 1024 MB and a 10 second budget — so it does nothing but copy and
// summarise. The game itself is plain static files under game/ (index.html,
// ES modules, a vendored three.min.js); the screenshots are real renders of
// the game in screenshots/. The dossier is built by the kit's own library
// (vendor/makefun-game.ts), so the summary the judge reads is byte for byte
// what the scorer rebuilds from the same files.
//
// Local check: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// then inspect out/dossier.json (it must stay under 1.5 MiB).

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in; the output is
// /output in the grader, or MAKEFUN_OUTPUT_DIR anywhere else.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, from the kit's gate reference: the dossier text is
// capped at 160 KiB; screenshots are at most 4 files of 256 KiB each; game/
// holds at most 993 entries and 48 MiB, and no path under it may exceed
// 1000 bytes. buildDossier refuses an entry that breaks them, which is the
// same refusal the scorer would give — better to fail loudly here.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

function fail(message: string): never {
  throw new Error(`PUERTO DEL SOL main.ts: ${message}`);
}

// Read a JPEG's pixel dimensions by scanning for its SOF0/SOF2 marker —
// stdlib only, no image library. The scorer also caps the screenshot
// dimensions (long side ≤ 1280, short side ≥ 480), so the pre-flight
// checks them too instead of trusting the file size alone.
function jpegSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) fail(`${path} is not a JPEG`);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    // SOF0 (baseline) and SOF2 (progressive) carry the dimensions.
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + length;
  }
  fail(`${path}: no SOF marker found, cannot read dimensions`);
}

// A cheap pre-flight: the game must exist and hold an index.html, and the
// screenshots must be present, before anything is copied. A missing game is
// a build bug, not a dossier problem, and this names it plainly.
const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shotFiles = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}
for (const name of shotFiles) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > DOSSIER_LIMITS.screenshots.max_bytes) {
    fail(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
  const { width, height } = jpegSize(join(shotsDir, name));
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (longSide > 1280) fail(`screenshot ${name} is ${width}x${height}, long side over 1280`);
  if (shortSide < 480) fail(`screenshot ${name} is ${width}x${height}, short side under 480`);
}

mkdirSync(outputDir, { recursive: true });
copyTree(gameDir, join(outputDir, 'game'));
copyTree(shotsDir, join(outputDir, 'screenshots'));

const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, buildDossier(resolve(outputDir), DOSSIER_LIMITS));
// The dossier itself is capped at 1.5 MiB: refuse to hand in an
// over-limit dossier silently.
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) {
  fail(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
}
