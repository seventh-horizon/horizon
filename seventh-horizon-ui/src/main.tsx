/* Make Veil the active theme on load */
import './themes/signal-veil.css';
import './themes/signal-rose.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize theme from saved preference (defaults to 'veil')
document.documentElement.dataset.theme = (localStorage.getItem('hz.theme') || 'veil') as 'veil' | 'rose';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Hide the splash after first frame (if present)
requestAnimationFrame(() => {
  document.getElementById('veil-splash')?.classList.add('hidden');
});
