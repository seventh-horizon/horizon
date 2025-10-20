// src/setup/overlays.ts
let overlaysMounted = false;

export function mountOverlays() {
  if (overlaysMounted) return;
  if (typeof document === 'undefined' || !document.body) return;

  const win = window as any;

  // Atomic check-and-set to tolerate StrictMode/HMR re-entrancy
  if (win.__SH_OVERLAYS_MOUNTED__) { overlaysMounted = true; return; }
  if (win.__SH_OVERLAYS_MOUNTING__) return;
  win.__SH_OVERLAYS_MOUNTING__ = true;

  // If a veil already exists, honor it as the mounted instance
  if (document.querySelector('.veil-overlay')) {
    win.__SH_OVERLAYS_MOUNTED__ = true;
    overlaysMounted = true;
    delete win.__SH_OVERLAYS_MOUNTING__;
    return;
  }

  const veil = document.createElement('div'); veil.className = 'veil-overlay'; veil.setAttribute('aria-hidden','true');
  const rose = document.createElement('div'); rose.className = 'rose-overlay';  rose.setAttribute('aria-hidden','true');
  const obs  = document.createElement('div'); obs.className  = 'observatory-overlay'; obs.setAttribute('aria-hidden','true');

  document.body.append(veil, rose, obs);

  win.__SH_OVERLAYS_MOUNTED__ = true;
  overlaysMounted = true;
  delete win.__SH_OVERLAYS_MOUNTING__;
}

export function getOverlay(selector: string): HTMLElement | null {
  return document.querySelector(selector) as HTMLElement | null;
}
