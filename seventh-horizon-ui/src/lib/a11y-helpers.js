/**
 * Seventh Horizon UI — A11y helpers
 *  - focusTrap for modals (open/close, restore focus, ESC)
 *  - tooltip hover/ESC behavior for [data-tooltip-id] patterns
 *  - toast stacking helper
 */

/**
 * @param {HTMLElement} modalDialog - The modal dialog element to trap focus within
 * @returns {{open: Function, close: Function}} Focus trap API
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
  let previousActive = document.activeElement;

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const list = nodes();
    if (list.length === 0) return;

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function open() {
    const list = nodes();
    (list[0] || modalDialog).focus({ preventScroll: true });
    document.addEventListener('keydown', onKeydown, true);
  }

  function close() {
    document.removeEventListener('keydown', onKeydown, true);
    if (previousActive && previousActive.focus) {
      previousActive.focus({ preventScroll: true });
    }
    modalDialog.dispatchEvent(new CustomEvent('sh:modal:closed', { bubbles: true }));
  }

  return { open, close };
}

/** Wire a modal root with backdrop and dialog */
export function bindModal(modalRoot) {
  const dialog = modalRoot.querySelector('.modal__dialog') || modalRoot;

  // Set up ARIA attributes
  modalRoot.setAttribute('role', modalRoot.getAttribute('role') || 'dialog');
  modalRoot.setAttribute('aria-modal', 'true');

  // Enable programmatic focus on the dialog
  if (!dialog.hasAttribute('tabindex')) {
    dialog.setAttribute('tabindex', '-1');
  }

  const trap = trapFocus(dialog);
  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('modal__backdrop')) {
      e.stopPropagation();
      trap.close();
      modalRoot.hidden = true;
    }
  };

  modalRoot.addEventListener('click', closeOnBackdrop);
  modalRoot.addEventListener('sh:modal:open', () => { modalRoot.hidden = false; trap.open(); });
  modalRoot.addEventListener('sh:modal:close', () => { trap.close(); modalRoot.hidden = true; });

  // initial hidden state for safety
  if (!modalRoot.hasAttribute('hidden')) modalRoot.hidden = true;

  return {
    open: () => modalRoot.dispatchEvent(new CustomEvent('sh:modal:open', { bubbles: true })),
    close: () => modalRoot.dispatchEvent(new CustomEvent('sh:modal:close', { bubbles: true })),
  };
}

/** Minimal tooltip behavior for elements with [data-tooltip-id] */
export function bindTooltips() {
  const triggers = document.querySelectorAll('[data-tooltip-id]');

  // Single global ESC handler for all tooltips
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.tooltip[data-open="true"]').forEach(tip => {
        tip.removeAttribute('data-open');
        const trigger = document.querySelector(`[data-tooltip-id="${tip.id}"]`);
        if (trigger) trigger.focus({ preventScroll: true });
      });
    }
  }, { passive: true });

  triggers.forEach((el) => {
    const id = el.getAttribute('data-tooltip-id');
    const tip = document.getElementById(id);
    if (!tip) return;

    let overTip = false;

    function open() { tip.setAttribute('data-open', 'true'); }
    function close() { if (!overTip) tip.removeAttribute('data-open'); }

    el.addEventListener('mouseenter', open);
    el.addEventListener('focus', open);
    el.addEventListener('mouseleave', close);
    el.addEventListener('blur', close);

    tip.addEventListener('mouseenter', () => { overTip = true; });
    tip.addEventListener('mouseleave', () => { overTip = false; close(); });
  });
}

/** Stack toasts vertically based on visible count */
export function stackToasts() {
  const toasts = Array.from(document.querySelectorAll('.toast:not([hidden])'));
  toasts.forEach((toast, i) => {
    toast.style.setProperty('--toast-stack-offset', `${i * 80}px`);
  });
}
