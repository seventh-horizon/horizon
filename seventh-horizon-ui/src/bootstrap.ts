// src/bootstrap.ts
import { mountOverlays } from './setup/overlays';
import { mountHeader } from './setup/mount-header';
// NOTE: DEV/test-only helper exposure is appended at the end of boot()
import { applyThemeTokens } from './lib/theme-tokens';
import tokens from './tokens/theme_tokens_v1.3.1.json';
import { initActivation } from './setup/activation-gate';

const boot = () => {
  // Activation sets [data-activated] + dataset flags; overlays are hidden if not active.
  initActivation();
  mountHeader();
  mountOverlays();
  applyThemeTokens(tokens as any);

  // Drive veil animation class based on current state + prefers-reduced-motion
  const veil = document.querySelector<HTMLElement>('.veil-overlay');

  // ensure we mark the overlay as decorative once
  if (veil && !veil.hasAttribute('data-motion-role')) {
    veil.setAttribute('data-motion-role', 'decorative');
  }

  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  const updateVeil = () => {
    const html = document.documentElement as HTMLElement & { dataset: any };
    const active = html.hasAttribute('data-activated');
    const motion = html.dataset.motionEnabled === 'true';
    const noReduce = !(mq && mq.matches);
    if (veil) {
      if (active && motion && noReduce) veil.classList.add('animating');
      else veil.classList.remove('animating');
    }
  };

  updateVeil();

  if (mq) {
    if ('addEventListener' in mq) mq.addEventListener('change', updateVeil);
    // Legacy Safari fallback
    else if ('addListener' in mq) (mq as any).addListener(updateVeil);
  }

  // sync when shActivate is called
  window.addEventListener('sh:ui:activation', updateVeil as any);

  // Cleanup on unload (SPA-friendly)
  window.addEventListener('beforeunload', () => {
    if (!mq) return;
    if ('removeEventListener' in mq) mq.removeEventListener('change', updateVeil as any);
    else if ('removeListener' in (mq as any)) (mq as any).removeListener(updateVeil as any);
  }, { once: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// ------------------------------------------------------------------------------------
// DEV / TEST-ONLY: expose minimal helpers so Playwright stubs can interact with the UI
// These are tree-shaken in prod and guarded at runtime.
// ------------------------------------------------------------------------------------
try {
  const env: any = (import.meta as any).env || {};
  if (env.DEV || env.VITEST) {
    (window as any).SH = (window as any).SH || {};
    // Lazy import to avoid pulling code into non-test pathways eagerly
    import('./lib/a11y-helpers.js').then(mod => {
      (window as any).SH.bindModal = mod.bindModal;
    }).catch(()=>{});
    import('./setup/overlays').then(mod => {
      (window as any).mountOverlays = mod.mountOverlays;
    }).catch(()=>{});
  }
} catch {}
