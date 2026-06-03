export class UpdateTransactionDto {
  type?: string;
  amount?: number;
  date?: string;
  category?: string;
  paymentMethod?: string;
  personId?: number;
  note?: string;
}
