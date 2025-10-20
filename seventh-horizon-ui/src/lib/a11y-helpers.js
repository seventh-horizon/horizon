/**
 * Seventh Horizon UI — A11y helpers
 *  - Focus trap for modals
 *  - Tooltip hover/ESC behavior
 *  - Toast stacking (with observer teardown)
 */

export function trapFocus(modalDialog) {
  const FOCUSABLE = [
    'a[href]', 'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe', 'object', 'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const nodes = () => Array.from(modalDialog.querySelectorAll(FOCUSABLE));
  let previousActive = null;
  let savedScrollY = 0;

  function onKeydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const list = nodes();
    if (list.length === 0) return;

    const first = list[0];
    const last  = list[list.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus({ preventScroll: true }); }
  }

  function open() {
    previousActive = document.activeElement;
    savedScrollY = window.scrollY || 0;
    const list = nodes();
    (list[0] || modalDialog).focus({ preventScroll: true });
    document.addEventListener('keydown', onKeydown, true);
    // Scroll lock with measured scrollbar compensation
    try {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${Math.max(0, sw)}px`);
      document.documentElement.classList.add('modal-open');
    } catch {}
  }

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    // Remove scroll lock and compensation first so layout/paint settle
    try {
      document.documentElement.classList.remove('modal-open');
      document.documentElement.style.removeProperty('--scrollbar-width');
    } catch {}

    // Defer focus restore until after layout/paint settles.
    // queueMicrotask + double rAF is the most reliable across WebKit.
    const target = previousActive;
    const restore = () => {
      if (target && document.contains(target) && typeof target.focus === 'function') {
        try { target.focus({ preventScroll: true }); } catch {}
        try { window.scrollTo(0, savedScrollY); } catch {}
      }
    };
    try {
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(restore);
        });
      });
    } catch {
      // Fallback if queueMicrotask/rAF throw for any reason
      try { restore(); } catch {}
    }

    modalDialog.dispatchEvent(new CustomEvent('sh:modal:closed', { bubbles: true }));
  }

  return { open, close };
}

export function bindModal(modalRoot) {
  // Track the element that had focus when the modal was opened (the "opener")
  let openerEl = null;
  const dialog = modalRoot.querySelector('.modal__dialog') || modalRoot;
  modalRoot.setAttribute('role', modalRoot.getAttribute('role') || 'dialog');
  modalRoot.setAttribute('aria-modal', 'true');
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

  const trap = trapFocus(dialog);

  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('modal__backdrop')) {
      e.stopPropagation(); modalRoot.dispatchEvent(new CustomEvent('sh:modal:close', { bubbles: true }));
    }
  };

  modalRoot.addEventListener('click', closeOnBackdrop);

  // Inert + aria-hidden for non-modal siblings (progressively enhanced)
  const siblings = () => Array.from(document.body.children).filter(n => !modalRoot.contains(n));
  const setBackdropA11y = (on) => {
    siblings().forEach(el => {
      try {
        const prev = el.getAttribute('aria-hidden');
        if (on) {
          el.dataset.shPrevAriaHidden = prev == null ? '' : prev;
          el.setAttribute('aria-hidden','true');
          el.inert = true;
        } else {
          const s = el.dataset.shPrevAriaHidden;
          if (s === '') el.removeAttribute('aria-hidden');
          else if (s != null) el.setAttribute('aria-hidden', s);
          delete el.dataset.shPrevAriaHidden;
          el.inert = false;
        }
      } catch {}
    });
  };

  // Open: capture opener, show + set backdrop a11y + trap focus
  modalRoot.addEventListener('sh:modal:open',  () => {
    openerEl = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;
    modalRoot.hidden = false;
    setBackdropA11y(true);
    trap.open();
  });

  // Close: remove backdrop a11y FIRST, then restore focus via trap.close(), then hide
  modalRoot.addEventListener('sh:modal:close', () => {
    setBackdropA11y(false);
    trap.close();
    modalRoot.hidden = true;

    // Ensure focus returns to opener element. On WebKit CI, deferring to the next two RAFs
    // is more reliable than a microtask because it runs *after* style/paint + inert toggles.
    const el = openerEl;
    const restore = () => {
      if (el && document.contains(el) && typeof el.focus === 'function') {
        try { el.focus({ preventScroll: true }); } catch {}
      }
    };
    try {
      if (typeof requestAnimationFrame === 'function') {
        // Double-RAF to run after DOM visibility + inert/aria-hidden changes fully settle.
        requestAnimationFrame(() => requestAnimationFrame(restore));
      } else {
        setTimeout(restore, 0);
      }
    } finally {
      openerEl = null;
    }
  });

  if (!modalRoot.hasAttribute('hidden')) modalRoot.hidden = true;

  return {
    open: () => modalRoot.dispatchEvent(new CustomEvent('sh:modal:open',  { bubbles: true })),
    close:() => modalRoot.dispatchEvent(new CustomEvent('sh:modal:close', { bubbles: true })),
  };
}

export function bindTooltips() {
  const triggers = document.querySelectorAll('[data-tooltip-id]');
  const onDocKey = (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.tooltip[data-open="true"]').forEach(tip => {
        tip.removeAttribute('data-open');
        const trigger = document.querySelector(`[data-tooltip-id="${tip.id}"]`);
        if (trigger) (trigger).focus?.({ preventScroll: true });
      });
    }
  };
  document.addEventListener('keydown', onDocKey);

  const cleanups = [];
  triggers.forEach((el) => {
    const id = el.getAttribute('data-tooltip-id');
    const tip = document.getElementById(id);
    if (!tip) return;

    let overTip = false;
    const open  = () => tip.setAttribute('data-open', 'true');
    const close = () => { if (!overTip) tip.removeAttribute('data-open'); };

    const onEnter = open;
    const onFocus = open;
    const onLeave = close;
    const onBlur  = close;
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('focus', onFocus);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('blur', onBlur);

    const onTipEnter = () => { overTip = true; };
    const onTipLeave = () => { overTip = false; close(); };
    tip.addEventListener('mouseenter', onTipEnter);
    tip.addEventListener('mouseleave', onTipLeave);

    cleanups.push(() => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('blur', onBlur);
      tip.removeEventListener('mouseenter', onTipEnter);
      tip.removeEventListener('mouseleave', onTipLeave);
    });
  });

  return { cleanup: () => {
    document.removeEventListener('keydown', onDocKey);
    cleanups.forEach(fn => { try { fn(); } catch {} });
  }};
}

export function stackToasts() {
  const toasts = Array.from(document.querySelectorAll('.toast:not([hidden])'));
  toasts.forEach((toast, i) => {
    toast.style.setProperty('--toast-stack-offset', `${i * 80}px`);
  });
}

let _toastRAF = 0;
function scheduleStackToasts() {
  if (_toastRAF) return;
  _toastRAF = requestAnimationFrame(() => {
    _toastRAF = 0;
    stackToasts();
  });
}

let mo = null;
export function observeToastStack() {
  if (mo) return;
  mo = new MutationObserver(scheduleStackToasts);
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden', 'class']
  });
  window.addEventListener('beforeunload', () => { mo?.disconnect(); mo = null; }, { once: true });
}
