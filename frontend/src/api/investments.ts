import client from './client';

// A position = how much is still invested in one category (Stocks, MF, Gold,
// FD, …), derived from all INVESTMENT / INVESTMENT_RETURN transactions.
export interface InvestmentPosition {
  category: string;
  invested: number;      // total ever put into this category
  returned: number;      // original cost already redeemed
  proceeds: number;      // cash received on redemptions
  remaining: number;     // still invested
  realizedGains: number;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
}

export interface InvestmentSummary {
  totalInvested: number;
  currentValue: number;
  realizedGains: number;
  openCount: number;
}

export const getInvestments = () =>
  client.get<InvestmentPosition[]>('/investments').then(r => r.data);

export const getInvestmentSummary = () =>
  client.get<InvestmentSummary>('/investments/summary').then(r => r.data);
