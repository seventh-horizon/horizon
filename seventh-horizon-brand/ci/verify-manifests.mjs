#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 1) Load Ajv (prefer the 2020 build; fall back to default)
let AjvCtor;
try {
  // Ajv v8 with explicit 2020 export
  ({ default: AjvCtor } = await import('ajv/dist/2020.js'));
} catch {
  ({ default: AjvCtor } = await import('ajv'));
}

// Formats (dates, emails, uri, etc.)
const { default: addFormats } = await import('ajv-formats');

// 2) Create Ajv instance
// - strictSchema:false avoids errors like "$dynamicAnchor" in strict mode
// - allErrors:true to report all failures at once
const ajv = new AjvCtor({
  strict: true,
  strictSchema: false,
  allErrors: true,
});

// Register formats
addFormats(ajv);

// 3) Find a schema file
const schemaCandidates = [
  'packages/schemas/token-schema.json',
  'packages/schemas/theme-tokens.schema.json',
  'schema/token-schema.json',
  'schemas/token-schema.json',
];

let schemaPath = null;
for (const rel of schemaCandidates) {
  const p = path.join(root, rel);
  try { await access(p); schemaPath = p; break; } catch {}
}
if (!schemaPath) {
  console.error('❌ Could not find a token schema in any of:\n  - ' + schemaCandidates.join('\n  - '));
  process.exit(1);
}

// 4) Find a manifest file
const manifestCandidates = [
  'manifests/theme_tokens_v1.3.2.json',
  'manifests/theme_tokens_v1.3.1.json',
  'manifests/theme_tokens.json',
  'manifests/tokens.json',
];

let manifestPath = null;
for (const rel of manifestCandidates) {
  const p = path.join(root, rel);
  try { await access(p); manifestPath = p; break; } catch {}
}
if (!manifestPath) {
  console.error('❌ Could not find a token manifest in any of:\n  - ' + manifestCandidates.join('\n  - '));
  process.exit(1);
}

// 5) Load + compile schema
let schema;
try {
  schema = JSON.parse(await readFile(schemaPath, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read schema:', e?.message || e);
  process.exit(1);
}

let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error('❌ Failed to compile schema:', e?.message || e);
  process.exit(1);
}

// 6) Load manifest and validate
let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (e) {
  console.error('❌ Failed to read manifest:', e?.message || e);
  process.exit(1);
}

const ok = validate(manifest);

if (!ok) {
  console.error('❌ Token manifest failed schema validation:\n', validate.errors);
  process.exit(1);
}

console.log('✅ Token manifest passes schema validation:', path.basename(manifestPath));
console.log('   Using schema:', path.relative(root, schemaPath));
