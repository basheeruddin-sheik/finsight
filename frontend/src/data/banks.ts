// Indian banks for the Account picker. Each entry's `short` + `color` drive
// the auto-populated avatar badge — no logo assets, just an initials chip
// that changes the instant a bank is picked.
export interface BankOption {
  key: string;
  label: string;
  short: string;     // avatar badge text — fallback when the logo image fails/isn't available
  color: string;      // avatar badge background (Tailwind class) — used with `short`
  domain?: string;    // bank's official domain, used to fetch its real logo via favicon lookup
  logo?: string;      // bundled local logo (public/), takes priority over `domain` — no network dependency
}

export const BANKS: BankOption[] = [
  { key: 'HDFC',      label: 'HDFC Bank',              short: 'HDFC',   color: 'bg-red-600',    logo: '/bank_icons/hdfc.png' },
  { key: 'ICICI',     label: 'ICICI Bank',              short: 'ICICI',  color: 'bg-orange-600', logo: '/bank_icons/icici.png' },
  { key: 'SBI',       label: 'State Bank of India',     short: 'SBI',    color: 'bg-blue-700',   logo: '/bank_icons/sbi.png' },
  { key: 'AXIS',      label: 'Axis Bank',               short: 'AXIS',   color: 'bg-purple-700', logo: '/bank_icons/axis.png' },
  { key: 'KOTAK',     label: 'Kotak Mahindra Bank',     short: 'KMB',    color: 'bg-red-700',    logo: '/bank_icons/kotak.png' },
  { key: 'BANDHAN',   label: 'Bandhan Bank',            short: 'BANDHAN', color: 'bg-rose-600',  logo: '/bank_icons/bandhan.png' },
  { key: 'YES',       label: 'Yes Bank',                short: 'YES',    color: 'bg-blue-600',   logo: '/bank_icons/yes.png' },
  { key: 'PNB',       label: 'Punjab National Bank',    short: 'PNB',    color: 'bg-amber-700',  logo: '/bank_icons/pnb.png' },
  { key: 'BOB',       label: 'Bank of Baroda',          short: 'BOB',    color: 'bg-orange-700', logo: '/bank_icons/bob.png' },
  { key: 'CANARA',    label: 'Canara Bank',             short: 'CNRB',   color: 'bg-yellow-700', domain: 'canarabank.com' },
  { key: 'UNION',     label: 'Union Bank of India',     short: 'UBI',    color: 'bg-blue-800',   logo: '/bank_icons/union.png' },
  { key: 'INDUSIND',  label: 'IndusInd Bank',           short: 'INDUS',  color: 'bg-red-800',    domain: 'indusind.com' },
  { key: 'IDFC',      label: 'IDFC FIRST Bank',         short: 'IDFC',   color: 'bg-teal-700',   logo: '/bank_icons/idfc.png' },
  { key: 'FEDERAL',   label: 'Federal Bank',            short: 'FED',    color: 'bg-blue-900',   logo: '/bank_icons/federal.png' },
  { key: 'RBL',       label: 'RBL Bank',                short: 'RBL',    color: 'bg-slate-700',  logo: '/bank_icons/rbl.png' },
  { key: 'PAYTM',     label: 'Paytm Payments Bank',     short: 'PAYTM',  color: 'bg-sky-600',    logo: '/bank_icons/paytm.png' },
  { key: 'INDIAN',    label: 'Indian Bank',             short: 'IB',     color: 'bg-emerald-700', logo: '/bank_icons/indian.png' },
  { key: 'CENTRAL',   label: 'Central Bank of India',   short: 'CBI',    color: 'bg-indigo-700', logo: '/bank_icons/central.png' },
  { key: 'OTHER',     label: 'Other',                   short: '?',      color: 'bg-slate-500' },
];

// Stored-value wallets — a separate pool of money from a bank, usually
// funded FROM a bank account (an Account Transfer). Same shape as BANKS so
// they share BankBadge / accountLabel / the same picker UI, just resolved
// from a different list based on the account's `type`.
export const WALLETS: BankOption[] = [
  { key: 'AMAZON_PAY',     label: 'Amazon Pay',      short: 'AMZN',  color: 'bg-orange-500', domain: 'amazon.in' },
  { key: 'PAYTM_WALLET',   label: 'Paytm Wallet',    short: 'PAYTM', color: 'bg-sky-600',     domain: 'paytm.com' },
  { key: 'PHONEPE_WALLET', label: 'PhonePe Wallet',  short: 'PHPE',  color: 'bg-violet-600',  domain: 'phonepe.com' },
  { key: 'MOBIKWIK',       label: 'MobiKwik',        short: 'MBK',   color: 'bg-blue-600',    domain: 'mobikwik.com' },
  { key: 'FREECHARGE',     label: 'Freecharge',      short: 'FC',    color: 'bg-orange-600',  domain: 'freecharge.in' },
  { key: 'OLA_MONEY',      label: 'Ola Money',       short: 'OLA',   color: 'bg-yellow-600',  domain: 'olamoney.com' },
  { key: 'JIO_MONEY',      label: 'JioMoney',        short: 'JIO',   color: 'bg-blue-800',    domain: 'jio.com' },
  { key: 'OTHER',          label: 'Other',           short: '?',     color: 'bg-slate-500' },
];

// Physical cash on hand — there's only ever one kind, so there's no picker
// list for it (unlike BANKS/WALLETS). A CASH account's `bank` key is always
// 'CASH'; give it a custom name (e.g. "Petty Cash") if you track more than one.
export const CASH_OPTION: BankOption = { key: 'CASH', label: 'Cash', short: '₹', color: 'bg-emerald-600' };

export const getBank   = (key: string) => BANKS.find(b => b.key === key) ?? BANKS[BANKS.length - 1];
export const getWallet = (key: string) => WALLETS.find(w => w.key === key) ?? WALLETS[WALLETS.length - 1];

// Resolves an institution regardless of whether it's a bank, a wallet, cash,
// or a credit card (cards are issued by banks, so they share the BANKS
// list). Defaults to BANK for accounts predating the `type` field.
export const getInstitution = (type: string | undefined, key: string): BankOption =>
  type === 'WALLET' ? getWallet(key) : type === 'CASH' ? CASH_OPTION : getBank(key);

// Real logo, fetched by domain via Google's public favicon service — we
// don't ship bank logo image files ourselves. (Clearbit's logo API, tried
// first, has been shut down — logo.clearbit.com no longer resolves at all.)
// Favicons are small/low-res, not polished brand marks, and some banks
// aren't indexed — `short`/`color` above are the fallback for those (and for
// any bank whose domain isn't set at all).
export const logoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

// Display label for an account: "HDFC Bank •••• 4821", or just the bank name
// (or custom name, for "Other"/Cash) when no last-4 was given. Credit cards
// get a product name if one was given ("HDFC Bank Regalia") — you can have
// more than one card from the same bank — or a plain "Credit Card" suffix
// otherwise, so they don't read identically to a checking account.
export function accountLabel(a: { type?: string; bank: string; last4?: string | null; customName?: string | null }): string {
  const inst = getInstitution(a.type, a.bank);
  const isCustomBank = a.bank === 'OTHER' || a.type === 'CASH';
  const base = isCustomBank && a.customName ? a.customName : inst.label;
  const named = a.type === 'CREDIT_CARD'
    ? (!isCustomBank && a.customName ? `${base} ${a.customName}` : `${base} Credit Card`)
    : base;
  return a.last4 ? `${named} •••• ${a.last4}` : named;
}
