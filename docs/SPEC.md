# Personal Finance Tracker — Project Spec

> A personal-use web app to track all money movement across UPI, cash, credit cards,
> borrows, family transfers, and split expenses — with a single clear savings number.

---

## Goals

- Track every rupee in and out, entered manually
- Know exactly where money is going (by category, payment method, person)
- Track borrows given — with and without interest
- Track money sent to family separately from personal expenses
- See net balance per friend, integrated with Splitwise
- Get one clear monthly savings number

---

## Non-Goals

- No SMS auto-parsing
- No bank API integration
- No multi-user support
- No investment / stock / mutual fund tracking
- No bill splitting calculator (Splitwise handles that)
- No App Store release

---

## Tech Stack

### Phase 1–4 (Local Development)
| Layer     | Choice                  | Reason                                       |
|-----------|-------------------------|----------------------------------------------|
| Frontend  | React + Vite + Tailwind | Familiar, fast UI                            |
| Backend   | NestJS                  | Familiar, structured                         |
| Database  | SQLite via Prisma       | No Docker, single file, zero ops             |
| API       | REST                    | Simple, no overhead                          |
| Mobile    | PWA                     | Add to iPhone home screen, no App Store fee  |

### Phase 5 (Production — No Laptop Needed)
| Layer     | Choice                  | Reason                                              |
|-----------|-------------------------|-----------------------------------------------------|
| Frontend  | React + Vite + Tailwind | Same codebase                                       |
| Hosting   | Vercel (free)           | Global CDN, instant deploys, iPhone accessible      |
| Backend   | Google Apps Script      | Serverless, zero cost, runs as you, no maintenance  |
| Database  | Google Sheets           | Editable directly, shareable, always accessible     |
| API       | GAS Web App URL         | Single HTTPS endpoint, no CORS issues               |
| Mobile    | PWA on Vercel           | Install on iPhone from Vercel URL                   |

---

## Project Structure

```
finsight/
├── docs/
│   ├── TRACKER.md       ← progress tracker (check this first)
│   ├── SPEC.md          ← this file
│   ├── DATA-MODELS.md   ← schema / sheet structure
│   ├── API.md           ← all endpoints (NestJS + GAS)
│   ├── TEST_CASES.md    ← manual test cases for all screens
│   ├── Code.gs          ← Google Apps Script (copy into GAS editor)
│   ├── PHASE-1.md       ← Core Setup
│   ├── PHASE-2.md       ← People & Money
│   ├── PHASE-3.md       ← Insights & Budgets
│   ├── PHASE-4.md       ← Splitwise + PWA
│   └── PHASE-5.md       ← Google Apps Script + Vercel
├── server/              ← NestJS backend (local dev only)
└── frontend/            ← React + Vite (runs locally + deploys to Vercel)
```

### How the API client works
`frontend/src/api/client.ts` reads `VITE_API_URL` at build time:
- **Not set / localhost** → calls `http://{hostname}:3000` (NestJS, local dev)
- **Set to Apps Script URL** → translates REST calls to GAS query-param format automatically

No API file changes needed when switching modes.

---

## Key Business Logic

### Real Savings Formula
```
Real Savings =
  Total Income
  - Total Personal Expenses
  - Total Family Transfers
  + Borrow Recoveries Received
  - Interest-free Borrows Given
```

### Interest Calculation (for borrows with interest)
```
Days outstanding = today - startDate
Interest owed    = principal × (rate / 100) × (days / 365)
Total owed       = principal + interest owed
```

### Splitwise Sync Rules
- Pull all friend balances from Splitwise API
- Match to Person records by name
- If a MANUAL entry exists for a person, keep manual (don't overwrite)
- Store lastSyncedAt so user knows when data was last refreshed

---

## Screens Overview

| Screen              | Purpose                                              |
|---------------------|------------------------------------------------------|
| Home                | Monthly snapshot — Income / Spent / Family / Saved   |
| Quick Add           | Fast transaction entry                               |
| Transactions        | Full list with filters and search                    |
| Friends & Splits    | Net balance per friend, Splitwise sync               |
| Borrows             | Active borrows, per-person ledger, add payment       |
| Family              | Per-member transfer history, monthly totals          |
| Reports             | Category breakdown, savings trend, money outside     |
| Budgets             | Monthly limits per category, progress bars           |
