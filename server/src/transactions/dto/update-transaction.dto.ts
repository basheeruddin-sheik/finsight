export class UpdateTransactionDto {
  type?: string;
  amount?: number;
  date?: string;
  category?: string;
  paymentMethod?: string;
  personId?: string;
  note?: string;
}
