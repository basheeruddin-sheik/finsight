# Phase 2 — People & Money

**Goal:** Borrows and family transfers tracked with per-person history. Friends balance visible.

**Prerequisite:** Phase 1 complete.

**Done when:** You can add a borrow, record a partial return, and see family transfers separately from personal expenses.

---

## Tasks

### Backend

#### 2.1 Persons API
Create `src/persons/` module:
- `GET  /persons` — list all, optional `?type=FRIEND|FAMILY` filter
- `POST /persons` — create person (name, type, phone)
- `DELETE /persons/:id` — delete (guard: reject if person has linked transactions or borrows)

#### 2.2 Borrows API
Create `src/borrows/` module:
- `GET  /borrows` — list all borrows, optional `?status=ACTIVE|PARTIALLY_RETURNED|SETTLED`
- `POST /borrows` — create borrow (personId, principal, interestRate, startDate)
- `POST /borrows/:id/payment` — record payment (amount, date, note)
- `PUT  /borrows/:id/settle` — mark as settled
- `GET  /borrows/summary` — total lent, recovered, outstanding, active count

#### 2.3 Interest Calculation Logic
Add to borrows service:
```
daysOutstanding = today - startDate
interestOwed    = principal × (rate / 100) × (days / 365)
totalOwed       = principal + interestOwed - totalPaymentsReceived
```
- Return `totalOwed` and `interestOwed` on every borrow response
- Auto-update borrow status to `PARTIALLY_RETURNED` when payment < totalOwed
- Auto-update to `SETTLED` when payment covers full amount

#### 2.4 Splits API (Manual Only — Splitwise comes in Phase 4)
Create `src/splits/` module:
- `GET  /splits` — list all split balances per friend
- `POST /splits/manual` — set manual balance for a person

---

### Frontend

#### 2.5 Borrows Screen
File: `src/pages/Borrows.tsx`

Show:
- Summary bar: Total Lent | Total Recovered | Total Outstanding
- List of active borrows, sorted by oldest first
- Each row: person name, principal, interest rate, total owed today, status badge
- Tap row → per-person detail:
  - Full payment history
  - Add payment button (opens modal: amount, date, note)
  - Mark settled button
- Floating Add Borrow button

#### 2.6 Family Screen
File: `src/pages/Family.tsx`

Show:
- List of family members
- Each member: total sent this month, total sent all time
- Tap member → monthly transfer history (list of transactions)
- Total sent across all family at top

#### 2.7 Friends & Splits Screen
File: `src/pages/Splits.tsx`

Show:
- Net totals at top: Total They Owe You | Total You Owe | Net
- List per friend: name, balance (green = they owe you, red = you owe them)
- Tap friend → set/update manual balance
- Note: Splitwise sync button added in Phase 4

#### 2.8 Persons Management
File: `src/pages/Persons.tsx` (or as a Settings sub-section)

Show:
- Separate lists: Friends | Family
- Add person (name, type, phone)
- Delete person

---

## Folder Structure After Phase 2

```
server/src/
├── transactions/      (Phase 1)
├── persons/
│   ├── persons.module.ts
│   ├── persons.controller.ts
│   ├── persons.service.ts
│   └── dto/
├── borrows/
│   ├── borrows.module.ts
│   ├── borrows.controller.ts
│   ├── borrows.service.ts
│   └── dto/
└── splits/
    ├── splits.module.ts
    ├── splits.controller.ts
    └── splits.service.ts

frontend/src/pages/
├── Home.tsx           (Phase 1)
├── AddTransaction.tsx (Phase 1)
├── Transactions.tsx   (Phase 1)
├── Borrows.tsx
├── Family.tsx
├── Splits.tsx
└── Persons.tsx
```
