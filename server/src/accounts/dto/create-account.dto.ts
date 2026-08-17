export class CreateAccountDto {
  type?: string;
  bank: string;
  last4?: string;
  customName?: string;
  openingBalance?: number;
  isDefault?: boolean;
}
