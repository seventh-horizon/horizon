import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import ErrorBoundary from './src/components/ErrorBoundary' // if path differs, adjust to actual path
import AppRefactored from './src/App.refactored'

const rootEl = document.getElementById('root')
if (!rootEl) {
  const el = document.createElement('div')
  el.id = 'root'
  document.body.appendChild(el)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppRefactored />
    </ErrorBoundary>
  </React.StrictMode>
)
## Migration Tasks

- [x] Baseline UI boots in CI
- [ ] Migrate drawers to new motion system
- [ ] Replace legacy tooltip with SH tooltip
