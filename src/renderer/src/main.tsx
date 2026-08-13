import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)

// Health signal: proves the renderer bundle loaded, React mounted, and the
// preload IPC bridge works. The smoke test listens for this via a marker
// file (only written when NOTESAPP_HEALTH_FILE is set).
window.api.app.rendererReady()
