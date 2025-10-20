// src/setup/mount-header.tsx
import { createRoot } from 'react-dom/client';
import Header from '../components/Header';

let headerMounted = false;
let headerCleanup: (() => void) | null = null;

export async function mountHeader() {
  if (headerMounted) return;
  if (typeof document === 'undefined' || !document.body) return;

  const ID = 'sh-header-root';

  // Respect an existing banner (SSR already provided one)
  if (document.getElementById(ID) || document.querySelector('header[role="banner"]')) {
    headerMounted = true;
    return;
  }

  // Detect common SSR environments and wait until hydration completes
  const ssrPresent =
    !!document.getElementById('__NEXT_DATA__') ||
    !!document.querySelector('[data-reactroot]') ||
    !!document.querySelector('script[type="application/json"][data-next-page]');

  if (ssrPresent && document.readyState !== 'complete') {
    window.addEventListener('load', () => mountHeader(), { once: true });
    return;
  }

  const el = document.createElement('header');
  el.id = ID;
  el.setAttribute('role', 'banner'); // explicit landmark
  document.body.prepend(el);

  const root = createRoot(el);
  root.render(<Header />);

  headerCleanup = () => {
    try { root.unmount(); el.remove(); } catch {}
    headerCleanup = null;
    headerMounted = false;
  };
  headerMounted = true;
}

export function unmountHeader() { headerCleanup?.(); }
