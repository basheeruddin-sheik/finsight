# Phase 4 — Splitwise + PWA

**Goal:** Splitwise balances synced automatically. App installable on iPhone as a PWA.

**Prerequisite:** Phase 3 complete.

**Done when:** App is on your iPhone home screen and Splitwise balances sync with one tap.

---

## Tasks

### Splitwise Integration

#### 4.1 Get Splitwise API Key
1. Go to https://secure.splitwise.com/apps
2. Register a new app (name it anything, personal use)
3. Copy the API key
4. Add to `server/.env`:
```
SPLITWISE_API_KEY=your_key_here
```

#### 4.2 Splitwise Sync Service
Create `src/splits/splitwise.service.ts`:

API calls:
- `GET https://secure.splitwise.com/api/v3.0/get_friends`
- Auth header: `Authorization: Bearer <API_KEY>`

Logic:
- For each friend returned, extract: name, email, balance amount, currency
- Match to existing Person records by name (case-insensitive)
- If no match → create Person automatically with type = FRIEND
- Update SplitBalance: set balance, source = SPLITWISE, lastSyncedAt = now
- Skip persons where source = MANUAL (don't overwrite manual entries)

#### 4.3 Sync Endpoint
`POST /splits/sync`

- Calls Splitwise API
- Updates SplitBalance records
- Returns: `{ synced: N, lastSyncedAt: ISO_DATE }`

#### 4.4 Update Splits Screen
In `src/pages/Splits.tsx`:
- Add "Sync with Splitwise" button at top
- Show "Last synced: X mins ago" timestamp
- Show source badge per friend (SPLITWISE | MANUAL)
- On sync: refresh list automatically

---

### PWA Setup

#### 4.5 Add PWA Manifest
Create `frontend/public/manifest.json`:
```json
{
  "name": "My Finance",
  "short_name": "Finance",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Add to `frontend/index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="My Finance">
```

Create simple icon files (192×192 and 512×512 PNG) and place in `frontend/public/`.

#### 4.6 Add Service Worker
Install Vite PWA plugin:
```bash
cd frontend
npm install -D vite-plugin-pwa
```

Configure in `vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
}
```

This caches the app shell so it loads even when offline.

#### 4.7 Test on iPhone
1. Build frontend: `cd frontend && npm run build && npm run preview`
2. Find your laptop's local IP: `ipconfig getifaddr en0` (Mac)
3. On iPhone Safari: go to `http://<laptop-ip>:4173`
4. Tap Share icon → Add to Home Screen
5. Open from home screen — verify it looks like a native app (no browser bar)
6. Turn off WiFi — verify cached pages still load

---

## Optional After Phase 4

If you want the app always available without your laptop being on:

**Deploy to a VPS (~₹400/month):**
1. Get a Hetzner or DigitalOcean server (cheapest plan)
2. Copy project files via SSH
3. Run NestJS with PM2: `pm2 start npm -- run start:prod`
4. Serve frontend with Nginx or `serve`
5. Access from iPhone anywhere, not just home WiFi

---

## Final Folder Structure

```
personal-finance/
├── TRACKER.md
├── SPEC.md
├── DATA-MODELS.md
├── API.md
├── PHASE-1.md
├── PHASE-2.md
├── PHASE-3.md
├── PHASE-4.md
├── server/
│   ├── src/
│   │   ├── transactions/
│   │   ├── persons/
│   │   ├── borrows/
│   │   ├── splits/
│   │   │   ├── splits.module.ts
│   │   │   ├── splits.controller.ts
│   │   │   ├── splits.service.ts
│   │   │   └── splitwise.service.ts
│   │   ├── reports/
│   │   ├── budgets/
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── dev.db
│   └── .env
└── frontend/
    ├── public/
    │   ├── manifest.json
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── src/
    │   ├── api/
    │   ├── pages/
    │   └── main.tsx
    └── vite.config.ts
```
