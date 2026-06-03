# API Reference

> All REST endpoints for the personal finance tracker backend (NestJS).
> Base URL: `http://localhost:3000`

---

## Transactions

### List Transactions
```
GET /transactions
```
Query params:
- `type` — INCOME | EXPENSE | FAMILY_TRANSFER | BORROW_GIVEN | BORROW_RECEIVED
- `category` — any Category enum value
- `from` — start date (YYYY-MM-DD)
- `to` — end date (YYYY-MM-DD)
- `search` — search by note text

Response:
```json
[
  {
    "id": 1,
    "type": "EXPENSE",
    "amount": 450,
    "date": "2026-06-03",
    "category": "FOOD_DINING",
    "paymentMethod": "GPAY",
    "note": "lunch",
    "person": null
  }
]
```

### Create Transaction
```
POST /transactions
```
Body:
```json
{
  "type": "EXPENSE",
  "amount": 450,
  "date": "2026-06-03",
  "category": "FOOD_DINING",
  "paymentMethod": "GPAY",
  "personId": null,
  "note": "lunch"
}
```

### Update Transaction
```
PUT /transactions/:id
```
Body: same fields as POST (all optional)

### Delete Transaction
```
DELETE /transactions/:id
```

### Monthly Summary
```
GET /transactions/summary?month=2026-06
```
Response:
```json
{
  "income": 80000,
  "expenses": 22000,
  "familyTransfers": 15000,
  "borrowsGiven": 5000,
  "borrowRecoveries": 2000,
  "realSavings": 40000,
  "savingsRate": 50
}
```

---

## Persons

### List Persons
```
GET /persons
```
Query params:
- `type` — FRIEND | FAMILY

### Create Person
```
POST /persons
```
Body:
```json
{
  "name": "Ravi",
  "type": "FRIEND",
  "phone": "9876543210"
}
```

### Delete Person
```
DELETE /persons/:id
```

---

## Borrows

### List Borrows
```
GET /borrows
```
Query params:
- `status` — ACTIVE | PARTIALLY_RETURNED | SETTLED

### Create Borrow
```
POST /borrows
```
Body:
```json
{
  "personId": 1,
  "principal": 5000,
  "interestRate": 0,
  "startDate": "2026-06-01"
}
```

### Record Payment (partial or full return)
```
POST /borrows/:id/payment
```
Body:
```json
{
  "amount": 2000,
  "date": "2026-06-10",
  "note": "partial return"
}
```

### Mark as Settled
```
PUT /borrows/:id/settle
```

### Borrows Summary
```
GET /borrows/summary
```
Response:
```json
{
  "totalLent": 20000,
  "totalRecovered": 8000,
  "totalOutstanding": 12000,
  "activeCount": 4
}
```

---

## Friends & Splits

### List Split Balances
```
GET /splits
```
Response:
```json
[
  {
    "personId": 1,
    "name": "Ravi",
    "balance": 300,
    "source": "SPLITWISE",
    "lastSyncedAt": "2026-06-03T10:00:00Z"
  }
]
```

### Sync from Splitwise
```
POST /splits/sync
```
Response:
```json
{
  "synced": 5,
  "lastSyncedAt": "2026-06-03T10:00:00Z"
}
```

### Add Manual Split Entry
```
POST /splits/manual
```
Body:
```json
{
  "personId": 1,
  "balance": 500
}
```

---

## Reports

### Monthly Breakdown
```
GET /reports/monthly?month=2026-06
```
Response:
```json
{
  "month": "2026-06",
  "byCategory": [
    { "category": "FOOD_DINING", "total": 6500 },
    { "category": "SHOPPING", "total": 4200 }
  ],
  "byPaymentMethod": [
    { "method": "GPAY", "total": 8000 },
    { "method": "CASH", "total": 2700 }
  ]
}
```

### Category Trend (last 6 months)
```
GET /reports/category-trend?category=FOOD_DINING
```
Response:
```json
[
  { "month": "2026-01", "total": 5800 },
  { "month": "2026-02", "total": 6100 }
]
```

### Savings Rate Trend
```
GET /reports/savings-rate?months=6
```
Response:
```json
[
  { "month": "2026-01", "income": 80000, "savings": 42000, "rate": 52.5 },
  { "month": "2026-02", "income": 80000, "savings": 38000, "rate": 47.5 }
]
```

### Money Outside
```
GET /reports/money-outside
```
Response:
```json
{
  "totalBorrowsOutstanding": 12000,
  "totalSplitsOwedToYou": 3500,
  "grandTotal": 15500
}
```

---

## Budgets

### List Budgets
```
GET /budgets?month=2026-06
```
Response:
```json
[
  {
    "id": 1,
    "category": "FOOD_DINING",
    "monthlyLimit": 8000,
    "spent": 6500,
    "percentUsed": 81,
    "overBudget": false
  }
]
```

### Create Budget
```
POST /budgets
```
Body:
```json
{
  "category": "FOOD_DINING",
  "monthlyLimit": 8000,
  "month": "2026-06"
}
```

### Update Budget
```
PUT /budgets/:id
```
Body:
```json
{
  "monthlyLimit": 10000
}
```
