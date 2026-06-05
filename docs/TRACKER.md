# Progress Tracker
> This is the first file to check when resuming work.
> Find the first phase that is not DONE and continue from there.

---

## Overall Status

| Phase | Title                            | Status      |
|-------|----------------------------------|-------------|
| 1     | Core Setup                       | DONE        |
| 2     | People & Money                   | DONE        |
| 3     | Insights & Budgets               | DONE        |
| 4     | PWA + UI Polish                  | DONE        |
| 5     | MongoDB + Railway + Vercel       | NOT STARTED |

---

## Phase 1 — Core Setup

| #    | Task                                                        | Done |
|------|-------------------------------------------------------------|------|
| 1.1  | Initialize NestJS project (`server/`)                       | [x]  |
| 1.2  | Setup Prisma with SQLite + run first migration              | [x]  |
| 1.3  | Transaction CRUD API                                        | [x]  |
| 1.4  | Transaction summary API (`GET /transactions/summary`)       | [x]  |
| 1.5  | Initialize React + Vite + Tailwind project (`frontend/`)    | [x]  |
| 1.6  | Setup API client (`src/api/`)                               | [x]  |
| 1.7  | Home screen UI — Income / Spent / Family / Saved snapshot   | [x]  |
| 1.8  | Quick Add screen — full transaction entry form              | [x]  |
| 1.9  | Transactions list screen — list with filters                | [x]  |
| 1.10 | Connect frontend to backend, end-to-end working             | [x]  |

**Phase 1 done when:** You can open the app, add a transaction, and see it reflected on the home screen.

---

## Phase 2 — People & Money

| #   | Task                                                         | Done |
|-----|--------------------------------------------------------------|------|
| 2.1 | Persons API (CRUD)                                           | [x]  |
| 2.2 | Borrows API — create, record payment, settle                 | [x]  |
| 2.3 | Interest calculation logic                                   | [x]  |
| 2.4 | Splits API — manual balance entry                            | [x]  |
| 2.5 | Borrows screen — active list, per-person ledger, add payment | [x]  |
| 2.6 | Family screen — per-member history, monthly total            | [x]  |
| 2.7 | Friends & Splits screen — net balance per friend             | [x]  |
| 2.8 | Persons management screen                                    | [x]  |

**Phase 2 done when:** You can add a borrow, record a partial return, and see family transfers separately.

---

## Phase 3 — Insights & Budgets

| #   | Task                                                    | Done |
|-----|---------------------------------------------------------|------|
| 3.1 | Monthly breakdown API                                   | [x]  |
| 3.2 | Category trend API (last 6 months)                      | [x]  |
| 3.3 | Savings rate trend API                                  | [x]  |
| 3.4 | Money outside API (borrows + unsettled splits)          | [x]  |
| 3.5 | Budgets API (CRUD)                                      | [x]  |
| 3.6 | Reports screen (breakdown, trends, money outside)       | [x]  |
| 3.7 | Budgets screen — limits, spent so far, % used, alerts   | [x]  |

**Phase 3 done when:** You can see where your money went this month and whether you're over budget.

---

## Phase 4 — PWA + UI Polish

| #   | Task                                                        | Done |
|-----|-------------------------------------------------------------|------|
| 4.1 | Add PWA manifest (`manifest.json`)                          | [x]  |
| 4.2 | Add service worker for offline support                      | [x]  |
| 4.3 | Transaction edit functionality                              | [x]  |
| 4.4 | Contextual note field per transaction type                  | [x]  |
| 4.5 | Custom categories (localStorage)                            | [x]  |
| 4.6 | Custom type label names (localStorage)                      | [x]  |
| 4.7 | Splits — remove Splitwise, manual "total paid / my share"   | [x]  |
| 4.8 | Test PWA on iPhone — Add to Home Screen, verify it works    | [ ]  |

**Phase 4 done when:** App is installable on iPhone home screen and all UI flows work cleanly.

---

## Phase 5 — MongoDB Atlas + Railway + Vercel

> Goal: eliminate the laptop entirely. NestJS backend runs on Railway (free),
> data lives in MongoDB Atlas (free 512MB cluster), frontend on Vercel.
> Access from iPhone anywhere via custom GoDaddy domain.

### Architecture
```
yourdomain.com         → Vercel  (React PWA)
api.yourdomain.com     → Railway (NestJS)
                              ↓
                       MongoDB Atlas (free cluster)
```

| #   | Task                                                                        | Done |
|-----|-----------------------------------------------------------------------------|------|
| 5.1 | Create MongoDB Atlas free cluster, get connection string                    | [ ]  |
| 5.2 | Replace Prisma/SQLite with Mongoose in NestJS server                        | [ ]  |
| 5.3 | Test all API endpoints locally with MongoDB                                 | [ ]  |
| 5.4 | Push to GitHub, deploy NestJS to Railway, set `MONGODB_URI` env var         | [ ]  |
| 5.5 | Deploy frontend to Vercel, set `VITE_API_URL` to Railway URL                | [ ]  |
| 5.6 | Point GoDaddy domain DNS → Vercel (frontend) + Railway (api subdomain)      | [ ]  |
| 5.7 | Update `VITE_API_URL` to custom domain (`api.yourdomain.com`)               | [ ]  |
| 5.8 | Test all features end-to-end on deployed URL                                | [ ]  |
| 5.9 | Install PWA on iPhone from Vercel/custom domain URL, verify all flows       | [ ]  |
| 5.10| (Optional) Migrate existing SQLite data to MongoDB                          | [ ]  |

**Phase 5 done when:** App opens on iPhone from custom domain, all data reads/writes go to MongoDB via Railway, no laptop required.

---

## How to Resume Work
1. Open this file first
2. Find the first phase where tasks have `[ ]`
3. Start from the first unchecked task
4. Mark `[x]` as each task is completed
5. Update the Overall Status table when a full phase is done
