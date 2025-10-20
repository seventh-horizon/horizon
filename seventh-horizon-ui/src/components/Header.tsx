import React from 'react';

export default function Header() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 12px',
      borderBottom: '1px solid var(--border, rgba(255,255,255,.08))'
    }}>
      <strong>Seventh Horizon</strong>
      <span aria-hidden="true">•</span>
      <span style={{opacity:.7}}>Dev Header</span>
    </div>
  );
}
