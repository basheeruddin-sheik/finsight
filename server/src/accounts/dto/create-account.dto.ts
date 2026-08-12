export class CreateAccountDto {
  bank: string;
  last4?: string;
  customName?: string;
  openingBalance?: number;
  isDefault?: boolean;
}
