import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const brandSrc = path.resolve(ROOT, '../seventh-horizon-brand/manifests/theme_tokens_v1.3.1.json');
const destDir  = path.resolve(ROOT, 'src/tokens');
const destFile = path.join(destDir, 'theme_tokens_v1.3.1.json');
const tmpFile  = destFile + '.tmp';

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

(async () => {
  const hasBrand = await exists(brandSrc);
  if (!hasBrand) {
    console.log('[prebuild:tokens] Brand manifest not found; keeping current tokens:', destFile);
    process.exit(0);
  }

  await fs.mkdir(destDir, { recursive: true });
  const raw = await fs.readFile(brandSrc, 'utf8');

  // Validate JSON first
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) {
    console.error('❌ Invalid JSON in brand manifest:', brandSrc);
    console.error(String(e));
    process.exit(1);
  }

  const pretty = JSON.stringify(parsed, null, 2) + '\n';

  await fs.writeFile(tmpFile, pretty, 'utf8');
  await fs.rename(tmpFile, destFile);

  console.log('[prebuild:tokens] Copied DreamB manifest →', path.relative(ROOT, destFile));
})();
