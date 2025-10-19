# Accessibility Notes (Modals, Tooltips, Toasts)

## Modals
- Add `role="dialog"` and `aria-modal="true"` to the modal root (or dialog node).
- Provide `aria-labelledby` (the modal title id) and, optionally, `aria-describedby`.
- `tabindex="-1"` is automatically set on `.modal__dialog` by `bindModal()` for programmatic focus.
- On open: focus moves into the modal; focus is trapped; ESC closes; clicking the backdrop closes.
- On close: focus returns to the trigger.

**Example:**
```html
<div class="modal" data-modal hidden>
  <div class="modal__backdrop"></div>
  <div class="modal__dialog" aria-labelledby="modal-title">
    <h2 id="modal-title">Modal Title</h2>
    <p>Content...</p>
    <button type="button">Close</button>
  </div>
</div>
```

## Tooltips
- Triggers use `data-tooltip-id="tooltip-id"`.
- Tooltip element gets `id="tooltip-id"` and toggles `data-open="true"`.
- ESC closes tooltips and returns focus to the trigger.
- Tooltip remains visible when hovered and should not obscure its trigger.

**Example:**
```html
<button data-tooltip-id="help-tip">Help</button>
<div id="help-tip" class="tooltip" role="tooltip">Helpful info</div>
```

## Toasts
- Use `role="status"` (polite) or `role="alert"` (assertive) for screen reader announcements.
- Toasts stack vertically using `--toast-stack-offset`, managed by JS.
