/**
 * Seventh Horizon UI — A11y setup bootstrap
 *  - Binds modals having [data-modal] root
 *  - Binds tooltip triggers having [data-tooltip-id]
 *  - Adds "rm" class for reduced motion if user prefers it
 *  - Stacks toasts and cleans observers on pagehide
 */
import { bindModal, bindTooltips, stackToasts } from '../lib/a11y-helpers.js';

document.addEventListener('DOMContentLoaded', () => {
  // Reduced motion class for manual clamp hooks
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('rm');
    }
  } catch {}

  // Bind all modals
  document.querySelectorAll('[data-modal]').forEach((root) => {
    const api = bindModal(root);
    // Expose for debugging if needed:
    root.__modal = api;
  });

  // Tooltips
  bindTooltips();

  // Toast stacking (run initially and when toasts change)
  stackToasts();
  const observer = new MutationObserver(stackToasts);
  document.querySelectorAll('.toast').forEach(toast => {
    observer.observe(toast, { attributes: true, attributeFilter: ['hidden'] });
  });

  // Clean up on page hide to avoid leaks in SPA navigations
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
});
