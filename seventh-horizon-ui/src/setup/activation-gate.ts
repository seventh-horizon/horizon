// src/setup/activation-gate.ts
export type ActivationResult = {
  active: boolean;
  cleanUrl: boolean;
  method: 'env' | 'url' | 'persisted' | 'none';
  source?: string;
};

const KEY = 'sh:activate';

function getPersisted(): boolean | null {
  try {
    const val = localStorage.getItem(KEY);
    if (val === null) return null;
    const normalized = val.toLowerCase().trim();
    switch (normalized) {
      case '1': case 'true': case 'yes': case 'on': case 'enabled':
        return true;
      case '0': case 'false': case 'no': case 'off': case 'disabled':
        return false;
      default:
        console.warn(`[Activation] Invalid value "${val}", resetting`);
        localStorage.removeItem(KEY);
        return null;
    }
  } catch (e) {
    console.warn('[Activation] localStorage unavailable:', e);
    return null;
  }
}

function setPersisted(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
}

export function readGate(): ActivationResult {
  const env = (import.meta as any).env;
  const envGate = env?.VITE_SH_ACTIVATE === '1';

  const allowUrl = env?.DEV || env?.VITE_SH_ACTIVATE_ALLOW_URL === '1';
  const u = new URL(window.location.href);
  const urlVal = u.searchParams.get('shActivate');
  const urlGateOn  = !!allowUrl && urlVal === '1';
  const urlGateOff = !!allowUrl && urlVal === '0';

  const persisted = getPersisted();

  const active = envGate ? (!urlGateOff) : (urlGateOn || persisted === true);

  const method: ActivationResult['method'] =
    envGate ? (urlGateOff ? 'url' : 'env')
    : urlGateOn ? 'url'
    : (persisted === true ? 'persisted' : 'none');

  const cleanUrl = urlGateOn || urlGateOff;
  const source = envGate
    ? (urlGateOff ? 'URL:shActivate=0 (override env)' : 'VITE_SH_ACTIVATE=1')
    : urlGateOn ? 'URL:shActivate=1'
    : (persisted !== null ? `localStorage:${persisted ? '1' : '0'}` : undefined);

  if (envGate && urlGateOff) console.warn('[Activation] Overriding env gate via URL (?shActivate=0)');

  return { active, cleanUrl, method, source };
}

export function applyActivation(on: boolean) {
  const html = document.documentElement;
  html.toggleAttribute('data-activated', on);
  // dataset flags are the runtime “authority” toggles (can be flipped by Theming Console)
  (html as any).dataset.motionEnabled = on ? 'true' : 'false';
  (html as any).dataset.focusEnabled  = on ? 'true' : 'false';
}

export function initActivation() {
  const { active, cleanUrl, method } = readGate();
  applyActivation(active);

  if (cleanUrl) {
    // One-shot cleanup after load to let routers ingest initial URL
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      const u = new URL(location.href);
      if (u.searchParams.has('shActivate')) {
        u.searchParams.delete('shActivate');
        history.replaceState(history.state, '', u);
      }
    };
    if (document.readyState === 'complete') queueMicrotask(cleanup);
    else window.addEventListener('load', cleanup, { once: true });
  }

  // Minimal telemetry: opt-in endpoint only; no PII. Rate limit: once per session.
  try {
    const env = (import.meta as any).env;
    const ep = env?.VITE_SH_TELEMETRY_ENDPOINT;
    const K = 'sh:telemetry:ui_activation:sent';
    if (env?.PROD && ep && !sessionStorage.getItem(K)) {
      const payload = { event: 'ui_activation', method, active, ts: Date.now() };
      navigator.sendBeacon?.(ep, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      sessionStorage.setItem(K, '1');
    }
  } catch {}
}

export function shActivate(on = true) {
  setPersisted(!!on);
  applyActivation(!!on);
  window.dispatchEvent(new CustomEvent('sh:ui:activation', { detail: { on: !!on } }));
}

declare global {
  interface Window { shActivate?: (on?: boolean) => void; }
  interface DocumentEventMap { 'sh:ui:activation': CustomEvent<{ on: boolean }>; }
}
window.shActivate = shActivate;
