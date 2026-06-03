# Phase 1 — Core Setup

**Goal:** Project running locally with transaction entry and home screen working end-to-end.

**Done when:** You can open the app, add a transaction, and see it reflected on the home screen.

---

## Tasks

### Backend

#### 1.1 Initialize NestJS project
```bash
cd personal-finance
npx @nestjs/cli new server --package-manager npm
```
- Remove unused boilerplate (AppController test, default hello route)
- Verify: `cd server && npm run start:dev` runs without errors

#### 1.2 Setup Prisma with SQLite
```bash
cd server
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```
- Copy full schema from `DATA-MODELS.md` into `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name init`
- Verify: `dev.db` file created in `server/prisma/`

#### 1.3 Transaction CRUD API
Create `src/transactions/` module with:
- `transactions.module.ts`
- `transactions.controller.ts`
- `transactions.service.ts`
- `dto/create-transaction.dto.ts`
- `dto/update-transaction.dto.ts`

Endpoints to implement:
- `GET  /transactions` — list with optional filters (type, category, from, to, search)
- `POST /transactions` — create
- `PUT  /transactions/:id` — update
- `DELETE /transactions/:id` — delete

#### 1.4 Transaction Summary API
Add to transactions service:
- `GET /transactions/summary?month=YYYY-MM`
- Returns: income, expenses, familyTransfers, borrowsGiven, borrowRecoveries, realSavings, savingsRate
- Use Real Savings formula from `SPEC.md`

---

### Frontend

#### 1.5 Initialize React + Vite + Tailwind
```bash
cd personal-finance
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
- Configure Tailwind in `tailwind.config.js` and `src/index.css`
- Verify: `npm run dev` shows Vite default page

#### 1.6 Setup API Client
- Install axios: `npm install axios`
- Create `src/api/client.ts` — base axios instance pointing to `http://localhost:3000`
- Create `src/api/transactions.ts` — typed functions for each endpoint

#### 1.7 Home Screen
File: `src/pages/Home.tsx`

Show:
- This month's Income
- This month's Expenses
- Family Transfers
- Real Savings (with % of income)
- Last 5 transactions list

#### 1.8 Quick Add Screen
File: `src/pages/AddTransaction.tsx`

Fields:
- Amount (large numeric input, auto-focus)
- Type selector: Expense | Income | Family | Borrow Given | Borrow Received
- Category grid (shown only when type = Expense) — large tap-friendly buttons
- Payment method selector: GPay | PhonePe | Paytm | Cash | Credit Card | Bank Transfer
- Date picker (default = today)
- Note (optional text input)
- Save button

#### 1.9 Transactions List Screen
File: `src/pages/Transactions.tsx`

Show:
- Full transaction list, newest first
- Filter bar: All | Expense | Income | Family | Borrow
- Each row: amount, category icon, payment method, date, note
- Tap row → edit or delete options

#### 1.10 Connect Frontend to Backend
- Configure CORS in NestJS (`main.ts`) to allow `http://localhost:5173`
- Test full flow: add transaction in UI → appears in list → home screen totals update
- Verify all filters work on transactions list

---

## Folder Structure After Phase 1

```
personal-finance/
├── server/
│   ├── src/
│   │   ├── transactions/
│   │   │   ├── transactions.module.ts
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.service.ts
│   │   │   └── dto/
│   │   ├── prisma/
│   │   │   └── prisma.service.ts
│   │   └── main.ts
│   └── prisma/
│       ├── schema.prisma
│       └── dev.db
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.ts
    │   │   └── transactions.ts
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── AddTransaction.tsx
    │   │   └── Transactions.tsx
    │   └── main.tsx
    └── index.html
```

---

## How to Run After Phase 1

Terminal 1 — Backend:
```bash
cd personal-finance/server
npm run start:dev
# runs on http://localhost:3000
```

Terminal 2 — Frontend:
```bash
cd personal-finance/frontend
npm run dev
# runs on http://localhost:5173
```
