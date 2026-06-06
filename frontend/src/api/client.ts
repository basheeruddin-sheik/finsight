// API client — works in two modes detected at runtime via VITE_API_URL:
//
//   NestJS mode  (default / local dev):
//     Calls http://{hostname}:3000 with full REST (GET/POST/PUT/DELETE).
//
//   Apps Script mode  (VITE_API_URL = GAS web app URL):
//     GAS only accepts GET and POST. This client translates every REST call
//     transparently — no changes needed in any api/*.ts file.
//
//   Translation table:
//     GET  /resource              → GET  ?path=resource
//     GET  /resource?k=v          → GET  ?path=resource&k=v
//     GET  /resource/subpath      → GET  ?path=resource%2Fsubpath
//     GET  /resource/:id          → GET  ?path=resource&id=:id
//     POST /resource              → POST ?path=resource            + body
//     PUT  /resource/:id          → POST ?path=resource&id=:id&method=PUT   + body
//     DELETE /resource/:id        → POST ?path=resource&id=:id&method=DELETE
//     POST /borrows/:id/payment   → POST ?path=borrows&id=:id&action=payment + body
//     PUT  /borrows/:id/settle    → POST ?path=borrows&id=:id&action=settle&method=PUT

import axios, { type AxiosRequestConfig } from 'axios';

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  `${window.location.protocol}//${window.location.hostname}:3000`;

const IS_GAS = API_URL.includes('script.google.com');

// ── Shared client interface ──────────────────────────────────────────────────
// Generic T matches the axios pattern: client.get<MyType>('/url').then(r => r.data)

interface ApiClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }>;
  post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<{ data: T }>;
  put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<{ data: T }>;
  patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<{ data: T }>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }>;
}

// ── NestJS / normal axios client ─────────────────────────────────────────────

const axiosClient: ApiClient = axios.create({ baseURL: API_URL });

// ── Google Apps Script client ─────────────────────────────────────────────────

function parsePath(rawUrl: string): { path: string; id?: string; action?: string } {
  const clean = rawUrl.replace(/^\//, '').split('?')[0];
  const parts = clean.split('/');

  if (parts.length === 1) return { path: parts[0] };

  if (parts.length === 2) {
    if (/^\d+$/.test(parts[1])) return { path: parts[0], id: parts[1] };
    return { path: parts.join('/') }; // e.g. "transactions/summary", "reports/monthly"
  }

  // /borrows/:id/payment or /borrows/:id/settle
  if (parts.length === 3 && /^\d+$/.test(parts[1])) {
    return { path: parts[0], id: parts[1], action: parts[2] };
  }

  return { path: clean };
}

async function gasRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
  axiosParams?: Record<string, unknown>,
): Promise<{ data: T }> {
  const { path, id, action } = parsePath(url);
  const qp = new URLSearchParams({ path });
  if (id)     qp.set('id', id);
  if (action) qp.set('action', action);

  if (axiosParams) {
    Object.entries(axiosParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qp.set(k, String(v));
    });
  }

  const upper = method.toUpperCase();

  if (upper === 'GET') {
    const res = await fetch(`${API_URL}?${qp}`);
    const json = await res.json();
    if (json?.error) throw Object.assign(new Error(json.error), { response: { data: json } });
    return { data: json };
  }

  if (upper !== 'POST') qp.set('method', upper);

  // GAS requires Content-Type: text/plain to avoid CORS preflight on the POST body
  const res = await fetch(`${API_URL}?${qp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(data ?? {}),
  });
  const json = await res.json();
  if (json?.error) throw Object.assign(new Error(json.error), { response: { data: json } });
  return { data: json };
}

const gasClient: ApiClient = {
  get:    <T>(url: string, config?: AxiosRequestConfig)                     => gasRequest<T>('GET',    url, undefined, config?.params),
  post:   <T>(url: string, data?: unknown, config?: AxiosRequestConfig)     => gasRequest<T>('POST',   url, data,      config?.params),
  put:    <T>(url: string, data?: unknown, config?: AxiosRequestConfig)     => gasRequest<T>('PUT',    url, data,      config?.params),
  patch:  <T>(url: string, data?: unknown, config?: AxiosRequestConfig)     => gasRequest<T>('PATCH',  url, data,      config?.params),
  delete: <T>(url: string, config?: AxiosRequestConfig)                     => gasRequest<T>('DELETE', url, undefined, config?.params),
};

// ── Export whichever client matches the environment ───────────────────────────

const client: ApiClient = IS_GAS ? gasClient : axiosClient;

export default client;
