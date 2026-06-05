# Personal Finance Tracker — Project Spec

> A personal-use web app to track all money movement across UPI, cash, credit cards,
> borrows, family transfers, and split expenses — with a single clear savings number.

---

## Goals

- Track every rupee in and out, entered manually
- Know exactly where money is going (by category, payment method, person)
- Track borrows given — with and without interest
- Track money sent to family separately from personal expenses
- See net balance per friend (manual entry, no Splitwise dependency)
- Get one clear monthly savings number
- Custom categories and type labels per user preference

---

## Non-Goals

- No SMS auto-parsing
- No bank API integration
- No multi-user support
- No investment / stock / mutual fund tracking
- No Splitwise integration (manual split entry only)
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

### Phase 5 (Production)
| Layer     | Choice                       | Reason                                                   |
|-----------|------------------------------|----------------------------------------------------------|
| Frontend  | React + Vite + Tailwind      | Same codebase, zero changes                              |
| Hosting   | Vercel (free)                | Global CDN, instant deploys, auto HTTPS                  |
| Backend   | NestJS on Railway (free)     | Real Node.js hosting, auto-deploy from GitHub            |
| Database  | MongoDB Atlas (free 512MB)   | No ops, scales, proper querying, reliable                |
| Domain    | GoDaddy custom domain        | yourdomain.com → Vercel, api.yourdomain.com → Railway    |
| Mobile    | PWA installed from Vercel    | Install on iPhone from custom domain URL                 |

### Why not Google Apps Script / Google Sheets
Sheets was prototyped and validated but rejected for production:
- 300–800ms response times (unusable on mobile)
- Full sheet scan on every request (degrades with data)
- No data integrity / transactions
- ~2s cold starts after idle
- 30 req/min throttle

---

## Project Structure

```
finsight/
├── docs/
│   ├── TRACKER.md       ← progress tracker (check this first)
│   ├── SPEC.md          ← this file
│   ├── DATA-MODELS.md   ← schema reference
│   ├── API.md           ← all endpoints
│   ├── TEST_CASES.md    ← manual test cases for all screens
│   ├── Code.gs          ← Google Apps Script (archived, not in use)
│   ├── PHASE-1.md through PHASE-5.md
├── server/              ← NestJS backend
└── frontend/            ← React + Vite
```

---

## Key Business Logic

### Real Savings Formula
```
Real Savings =
  Total Income
  - Total Personal Expenses
  - Total Family Transfers
  + Borrow Recoveries Received
  - Borrows Given
```

### Interest Calculation (for borrows with interest)
```
Days outstanding = today - startDate
Interest owed    = principal × (rate / 100) × (days / 365)
Total owed       = principal + interest owed
```

### Splits (Manual)
- User enters: Total I paid + My share → app computes "to get back" = total - share
- Stored as a net balance per person (positive = they owe you, negative = you owe them)
- No Splitwise sync — fully manual

### Customization (localStorage)
- Custom categories: stored in `localStorage` key `finsight_settings`
- Custom type labels: rename "Family Transfer" → whatever you want
- Settings page at `/settings` (People → Customize)

---

## Screens Overview

| Screen              | Purpose                                              |
|---------------------|------------------------------------------------------|
| Home                | Monthly snapshot — Income / Spent / Family / Saved   |
| Quick Add           | Fast transaction entry with contextual note field    |
| Transactions        | Full list with filters, edit, delete                 |
| Friends & Splits    | Manual net balance per friend                        |
| Borrows             | Active borrows, per-person ledger, add payment       |
| Family              | Per-member transfer history, monthly totals          |
| Reports             | Category breakdown, savings trend, money outside     |
| Budgets             | Monthly limits per category, progress bars           |
| Customize           | Custom categories and type label names               |
