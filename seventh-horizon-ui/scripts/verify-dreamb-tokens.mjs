#!/usr/bin/env node
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const urlIx=args.indexOf('--url'); const fileIx=args.indexOf('--file');

async function loadJson(){
  if (urlIx!==-1 && args[urlIx+1]) {
    const u=args[urlIx+1];
    const r=await fetch(u);
    if (!r.ok) throw new Error(`Fetch failed: ${r.status} ${r.statusText}`);
    return r.json();
  }
  if (fileIx!==-1 && args[fileIx+1]) {
    const p=path.resolve(__dirname,'..',args[fileIx+1]);
    return JSON.parse(fs.readFileSync(p,'utf8'));
  }
  throw new Error('Provide --url or --file');
}

const hasNested = (o,p)=>p.split('.').reduce((x,k)=>x?.[k],o)!==undefined;
const hasFlat   = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);

function repRich(t){
  const need=['_meta.version','brand.cyan.rgb','brand.violet.rgb','brand.magenta.rgb','brand.navy.rgb','motion.signal_hue_deg','motion.resonance_gain','focus.rose1_hsl','focus.rose2_hsl'];
  const rows=need.map(k=>[k,hasNested(t,k)]);
  return {label:'DreamB (rich)', ok: rows.every(([,v])=>v), rows};
}
function repFlat(t){
  const need=['brand.cyan.rgb','brand.violet.rgb','brand.magenta.rgb','brand.navy.rgb','motion.signal.hue','motion.resonance','focus.rose1.hsl','focus.rose2.hsl'];
  const rows=need.map(k=>[k,hasFlat(t,k)]);
  return {label:'UI (flattened)', ok: rows.every(([,v])=>v), rows};
}
function print({label,ok,rows}){ console.log(`${label} tokens sanity:`, ok?'OK':'MISSING'); for(const [k,v] of rows) console.log(` - ${k}: ${v?'✓':'✗'}`); }

try{
  const t = await loadJson();
  const rich = repRich(t);
  const flat = repFlat(t);
  if (rich.ok) { print(rich); process.exit(0); }
  if (flat.ok) { print(flat); process.exit(0); }
  print(rich); print(flat); process.exit(1);
} catch(e){
  console.error('Verification error:', e.message);
  process.exit(1);
}
