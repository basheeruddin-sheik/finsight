import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'

const domain   = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined

const onRedirectCallback = (appState?: AppState) => {
  window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname)
}

const root = createRoot(document.getElementById('root')!)

if (!domain || !clientId || !audience) {
  root.render(
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
      <div>
        <p style={{ fontWeight: 600 }}>Auth not configured</p>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID and VITE_AUTH0_AUDIENCE in frontend/.env.local. See AUTH_SETUP.md.
        </p>
      </div>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{ redirect_uri: window.location.origin, audience }}
        useRefreshTokens
        cacheLocation="localstorage"
        onRedirectCallback={onRedirectCallback}
      >
        <App />
      </Auth0Provider>
    </StrictMode>,
  )
}

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
