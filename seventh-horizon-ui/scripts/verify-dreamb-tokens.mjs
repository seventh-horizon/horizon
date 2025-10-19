#!/usr/bin/env node
/**
 * Prep-time sanity checker for DreamB tokens.
 * Usage:
 *   node scripts/verify-dreamb-tokens.mjs --url https://.../theme_tokens_v1.3.1.json
 *   node scripts/verify-dreamb-tokens.mjs --file ./brand/theme_tokens_v1.3.1.json
 * Does NOT alter the app; only prints a report.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const urlIx  = args.indexOf('--url');
const fileIx = args.indexOf('--file');

async function loadJson() {
  if (urlIx !== -1 && args[urlIx+1]) {
    const u = args[urlIx+1];
    const res = await fetch(u);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return await res.json();
  }
  if (fileIx !== -1 && args[fileIx+1]) {
    const p = path.resolve(__dirname, '..', args[fileIx+1]);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  throw new Error('Provide --url or --file');
}

function check(tokens) {
  const out = [];
  const need = [
    '_meta.version',
    'brand.cyan.rgb', 'brand.violet.rgb', 'brand.magenta.rgb', 'brand.navy.rgb',
    'motion.signal_hue_deg', 'motion.resonance_gain',
    'focus.rose1_hsl', 'focus.rose2_hsl'
  ];
  const get = (path) => path.split('.').reduce((o,k)=>o?.[k], tokens);
  for (const k of need) out.push([k, get(k) !== undefined]);

  const ok = out.every(([_,v])=>v);
  return { ok, table: out };
}

try {
  const tokens = await loadJson();
  const { ok, table } = check(tokens);
  console.log('DreamB tokens sanity:', ok ? 'OK' : 'MISSING');
  for (const [k, v] of table) console.log(` - ${k}: ${v ? '✓' : '✗'}`);
  if (!ok) process.exit(1);
} catch (e) {
  console.error('Verification error:', e.message);
  process.exit(1);
}
