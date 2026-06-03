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

| Layer     | Choice                  | Reason                                       |
|-----------|-------------------------|----------------------------------------------|
| Frontend  | React + Vite + Tailwind | Familiar, fast UI                            |
| Backend   | NestJS                  | Familiar, structured                         |
| Database  | SQLite via Prisma       | No Docker, single file, zero ops             |
| ORM       | Prisma                  | Type-safe schema, easy migrations            |
| API       | REST                    | Simple, no overhead                          |
| Mobile    | PWA                     | Add to iPhone home screen, no App Store fee  |
| Splitwise | REST API (free)         | Pull balances only, no write-back needed     |

---

## Project Structure

```
personal-finance/
├── docs/
│   ├── TRACKER.md      ← progress tracker (check this first when resuming)
│   ├── SPEC.md         ← this file
│   ├── DATA-MODELS.md  ← Prisma schema and model definitions
│   ├── API.md          ← all REST endpoints
│   ├── PHASE-1.md      ← Core Setup detail
│   ├── PHASE-2.md      ← People & Money detail
│   ├── PHASE-3.md      ← Insights & Budgets detail
│   └── PHASE-4.md      ← Splitwise + PWA detail
├── server/             ← NestJS backend (created in Phase 1)
└── frontend/           ← React + Vite frontend (created in Phase 1)
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
