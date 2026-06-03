# Progress Tracker
> This is the first file to check when resuming work.
> Find the first phase that is not DONE and continue from there.

---

## Overall Status

| Phase | Title               | Status      |
|-------|---------------------|-------------|
| 1     | Core Setup          | NOT STARTED |
| 2     | People & Money      | NOT STARTED |
| 3     | Insights & Budgets  | NOT STARTED |
| 4     | Splitwise + PWA     | NOT STARTED |

---

## Phase 1 — Core Setup

| #    | Task                                                        | Done |
|------|-------------------------------------------------------------|------|
| 1.1  | Initialize NestJS project (`server/`)                       | [ ]  |
| 1.2  | Initialize React + Vite + Tailwind project (`frontend/`)    | [ ]  |
| 1.3  | Setup Prisma with SQLite — define full schema               | [ ]  |
| 1.4  | Run first migration, verify DB file created                 | [ ]  |
| 1.5  | Transaction CRUD API                                        | [ ]  |
| 1.6  | Transaction summary API (`GET /transactions/summary`)       | [ ]  |
| 1.7  | Home screen UI — Income / Spent / Family / Saved snapshot   | [ ]  |
| 1.8  | Quick Add screen — full transaction entry form              | [ ]  |
| 1.9  | Transactions list screen — list with filters                | [ ]  |
| 1.10 | Connect frontend to backend, end-to-end working             | [ ]  |

**Phase 1 done when:** You can open the app, add a transaction, and see it reflected on the home screen.

---

## Phase 2 — People & Money

| #   | Task                                                         | Done |
|-----|--------------------------------------------------------------|------|
| 2.1 | Persons API (CRUD)                                           | [ ]  |
| 2.2 | Borrows API — create, record payment, settle                 | [ ]  |
| 2.3 | Interest calculation logic                                   | [ ]  |
| 2.4 | Borrows screen — active list, per-person ledger, add payment | [ ]  |
| 2.5 | Family screen — per-member history, monthly total            | [ ]  |
| 2.6 | Friends & Splits screen — net balance per friend             | [ ]  |
| 2.7 | Manual split entry                                           | [ ]  |

**Phase 2 done when:** You can add a borrow, record a partial return, and see family transfers separately.

---

## Phase 3 — Insights & Budgets

| #   | Task                                                    | Done |
|-----|---------------------------------------------------------|------|
| 3.1 | Monthly breakdown API                                   | [ ]  |
| 3.2 | Category trend API (last 6 months)                      | [ ]  |
| 3.3 | Savings rate trend API                                  | [ ]  |
| 3.4 | Money outside API (borrows + unsettled splits)          | [ ]  |
| 3.5 | Reports screen — monthly category breakdown chart       | [ ]  |
| 3.6 | Savings rate trend chart                                | [ ]  |
| 3.7 | Money outside screen                                    | [ ]  |
| 3.8 | Budgets API (CRUD)                                      | [ ]  |
| 3.9 | Budgets screen — limits, spent so far, % used, alerts   | [ ]  |

**Phase 3 done when:** You can see where your money went this month and whether you're over budget.

---

## Phase 4 — Splitwise + PWA

| #   | Task                                                        | Done |
|-----|-------------------------------------------------------------|------|
| 4.1 | Add Splitwise API key to env config                         | [ ]  |
| 4.2 | Splitwise sync API — pull friend balances                   | [ ]  |
| 4.3 | Merge Splitwise balances with manual entries                | [ ]  |
| 4.4 | Update Friends & Splits screen with synced data             | [ ]  |
| 4.5 | Add PWA manifest (`manifest.json`)                          | [ ]  |
| 4.6 | Add service worker for offline support                      | [ ]  |
| 4.7 | Test on iPhone — Add to Home Screen, verify it works        | [ ]  |

**Phase 4 done when:** App is on your iPhone home screen and Splitwise balances sync with one tap.

---

## How to Resume Work
1. Open this file first
2. Find the first phase where tasks have `[ ]`
3. Start from the first unchecked task
4. Mark `[x]` as each task is completed
5. Update the Overall Status table when a full phase is done
