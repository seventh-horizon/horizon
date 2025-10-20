/**
 * Seventh Horizon UI — A11y helpers
 *  - Focus trap for modals (with scroll lock + aria-hidden/inert background)
 *  - Tooltip hover/ESC behavior (with cleanup)
 *  - Toast stacking (debounced via rAF + MutationObserver)
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
    if (previousActive && document.contains(previousActive) && typeof previousActive.focus === 'function') {
      previousActive.focus({ preventScroll: true });
      try { window.scrollTo(0, savedScrollY); } catch {}
    }
    modalDialog.dispatchEvent(new CustomEvent('sh:modal:closed', { bubbles: true }));
    // Remove scroll lock and compensation
    try {
      document.documentElement.classList.remove('modal-open');
      document.documentElement.style.removeProperty('--scrollbar-width');
    } catch {}
  }

  return { open, close };
}

export function bindModal(modalRoot) {
  const dialog = modalRoot.querySelector('.modal__dialog') || modalRoot;
  modalRoot.setAttribute('role', modalRoot.getAttribute('role') || 'dialog');
  modalRoot.setAttribute('aria-modal', 'true');
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');

  const trap = trapFocus(dialog);
  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('modal__backdrop')) {
      e.stopPropagation(); trap.close(); modalRoot.hidden = true;
    }
  };

  modalRoot.addEventListener('click', closeOnBackdrop);
  modalRoot.addEventListener('sh:modal:open',  () => { modalRoot.hidden = false; trap.open();  });
  modalRoot.addEventListener('sh:modal:close', () => { trap.close();        modalRoot.hidden = true; });

  if (!modalRoot.hasAttribute('hidden')) modalRoot.hidden = true;

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
  modalRoot.addEventListener('sh:modal:open',  () => setBackdropA11y(true));
  modalRoot.addEventListener('sh:modal:close', () => setBackdropA11y(false));

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
        const trigger = document.querySelector(`[data-tooltip-id="\${tip.id}"]`);
        if (trigger) trigger.focus({ preventScroll: true });
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

    const onEnter = open, onFocus = open, onLeave = close, onBlur = close;
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
