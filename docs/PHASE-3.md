# Phase 3 — Insights & Budgets

**Goal:** Reports and budget tracking working. You can see where your money went and whether you're over budget.

**Prerequisite:** Phase 2 complete.

**Done when:** Monthly category breakdown is visible and budgets show progress with alerts.

---

## Tasks

### Backend

#### 3.1 Monthly Breakdown API
`GET /reports/monthly?month=YYYY-MM`

Returns:
- Total per category (for EXPENSE transactions)
- Total per payment method
- Top 3 spending categories

#### 3.2 Category Trend API
`GET /reports/category-trend?category=FOOD_DINING`

Returns:
- Last 6 months totals for the given category
- Used to show trend line in UI

#### 3.3 Savings Rate Trend API
`GET /reports/savings-rate?months=6`

Returns:
- Per month: income, expenses, familyTransfers, realSavings, savingsRate %
- Used to show 6-month savings trend chart

#### 3.4 Money Outside API
`GET /reports/money-outside`

Returns:
- Total borrows outstanding (ACTIVE + PARTIALLY_RETURNED)
- Total splits where friends owe you (positive balances)
- Grand total

#### 3.5 Budgets API
- `GET  /budgets?month=YYYY-MM` — list budgets with spent-so-far and % used
- `POST /budgets` — set budget for a category and month
- `PUT  /budgets/:id` — update monthly limit

Budget response must include:
- `spent` — actual spending in that category for that month (from transactions)
- `percentUsed` — (spent / monthlyLimit) × 100
- `overBudget` — true if percentUsed > 100

---

### Frontend

#### 3.6 Reports Screen
File: `src/pages/Reports.tsx`

Sections:
1. **Monthly Breakdown** — horizontal bar chart, one bar per category, sorted by highest spend
2. **Payment Method Split** — pie or donut chart
3. **Savings Rate Trend** — line chart, last 6 months
4. **Money Outside** — single card: borrows outstanding + splits owed to you + grand total

Month selector at top (default = current month), allow navigating back.

Chart library: use `recharts` (lightweight, React-native)
```bash
npm install recharts
```

#### 3.7 Budgets Screen
File: `src/pages/Budgets.tsx`

Show:
- Per category: limit, amount spent, progress bar
- Color: green <60% | yellow 60–80% | red >80%
- Alert badge if over budget
- Edit limit button per category
- Add budget button for categories with no limit set
- Month selector at top

---

## Folder Structure After Phase 3

```
server/src/
├── transactions/    (Phase 1)
├── persons/         (Phase 2)
├── borrows/         (Phase 2)
├── splits/          (Phase 2)
├── reports/
│   ├── reports.module.ts
│   ├── reports.controller.ts
│   └── reports.service.ts
└── budgets/
    ├── budgets.module.ts
    ├── budgets.controller.ts
    ├── budgets.service.ts
    └── dto/

frontend/src/pages/
├── Home.tsx           (Phase 1)
├── AddTransaction.tsx (Phase 1)
├── Transactions.tsx   (Phase 1)
├── Borrows.tsx        (Phase 2)
├── Family.tsx         (Phase 2)
├── Splits.tsx         (Phase 2)
├── Persons.tsx        (Phase 2)
├── Reports.tsx
└── Budgets.tsx
```
