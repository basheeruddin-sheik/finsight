import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on all interfaces so phones on the same WiFi can reach the dev
    // server at http://<your-mac-LAN-IP>:5173 (printed as "Network:" on start).
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    // Railway (and other PaaS) injects PORT at runtime — honour it.
    port: parseInt(process.env.PORT ?? '4173'),
    host: true,
  },
})
