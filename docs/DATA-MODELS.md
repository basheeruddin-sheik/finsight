# Data Models

> All Prisma schema definitions for the personal finance tracker.

---

## Enums

```prisma
enum TransactionType {
  INCOME
  EXPENSE
  FAMILY_TRANSFER
  BORROW_GIVEN
  BORROW_RECEIVED
}

enum Category {
  FOOD_DINING
  GROCERIES
  SHOPPING
  FUEL_TRAVEL
  SUBSCRIPTIONS
  MEDICAL
  ENTERTAINMENT
  UTILITIES
  OTHER
}

enum PaymentMethod {
  GPAY
  PHONEPE
  PAYTM
  CASH
  CREDIT_CARD
  BANK_TRANSFER
  OTHER
}

enum PersonType {
  FRIEND
  FAMILY
}

enum BorrowStatus {
  ACTIVE
  PARTIALLY_RETURNED
  SETTLED
}

enum SplitSource {
  SPLITWISE
  MANUAL
}
```

---

## Models

### Transaction
> Every money movement — income, expense, family transfer, borrow.

```prisma
model Transaction {
  id            Int              @id @default(autoincrement())
  type          TransactionType
  amount        Float
  date          DateTime
  category      Category?        // only for EXPENSE type
  paymentMethod PaymentMethod
  personId      Int?             // links to Person for FAMILY_TRANSFER, BORROW_GIVEN, BORROW_RECEIVED
  note          String?
  createdAt     DateTime         @default(now())

  person        Person?          @relation(fields: [personId], references: [id])
}
```

### Person
> A friend or family member referenced in transactions, borrows, or splits.

```prisma
model Person {
  id           Int          @id @default(autoincrement())
  name         String
  type         PersonType
  phone        String?
  createdAt    DateTime     @default(now())

  transactions Transaction[]
  borrows      Borrow[]
  splitBalance SplitBalance?
}
```

### Borrow
> Money lent to someone — with or without interest.

```prisma
model Borrow {
  id           Int           @id @default(autoincrement())
  personId     Int
  principal    Float
  interestRate Float         @default(0)   // 0 = interest-free
  startDate    DateTime
  status       BorrowStatus  @default(ACTIVE)
  createdAt    DateTime      @default(now())

  person       Person        @relation(fields: [personId], references: [id])
  payments     BorrowPayment[]
}
```

### BorrowPayment
> Tracks partial or full returns against a borrow.

```prisma
model BorrowPayment {
  id        Int      @id @default(autoincrement())
  borrowId  Int
  amount    Float
  date      DateTime
  note      String?

  borrow    Borrow   @relation(fields: [borrowId], references: [id])
}
```

### SplitBalance
> Net balance per friend — synced from Splitwise or entered manually.
> Positive = they owe you. Negative = you owe them.

```prisma
model SplitBalance {
  id           Int         @id @default(autoincrement())
  personId     Int         @unique
  balance      Float       // positive = they owe you, negative = you owe them
  lastSyncedAt DateTime?
  source       SplitSource @default(MANUAL)

  person       Person      @relation(fields: [personId], references: [id])
}
```

### Budget
> Monthly spending limit per category.

```prisma
model Budget {
  id           Int      @id @default(autoincrement())
  category     Category
  monthlyLimit Float
  month        String   // format: YYYY-MM (e.g. "2026-06")

  @@unique([category, month])
}
```

---

## Relationships Summary

```
Person
  ├── has many Transactions    (via personId)
  ├── has many Borrows         (via personId)
  └── has one  SplitBalance    (via personId)

Borrow
  └── has many BorrowPayments  (via borrowId)
```

---

## Notes

- `category` on Transaction is optional — only required when type is `EXPENSE`
- `personId` on Transaction is optional — required for `FAMILY_TRANSFER`, `BORROW_GIVEN`, `BORROW_RECEIVED`
- `SplitBalance.balance` is a net figure, not per-transaction — updated on each Splitwise sync or manual entry
- `Budget.month` is stored as a string (`YYYY-MM`) for simple filtering without date math
