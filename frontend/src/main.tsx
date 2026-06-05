import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Only register SW in production — in dev it caches Vite modules and serves stale code
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  } else {
    // Unregister any previously registered SW so dev HMR works correctly
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }
}
