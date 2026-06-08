export class CreateTransactionDto {
  type: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod: string;
  personId?: string;
  note?: string;
  borrowId?: string;          // repayment / interest → the lend txn it applies to
  interestExpected?: number;  // BORROW_GIVEN only
  costBasis?: number;         // INVESTMENT_RETURN only: original amount invested
}
