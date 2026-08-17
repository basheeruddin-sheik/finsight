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

export const getBank = (key: string) => BANKS.find(b => b.key === key) ?? BANKS[BANKS.length - 1];

// Real logo, fetched by domain via Google's public favicon service — we
// don't ship bank logo image files ourselves. (Clearbit's logo API, tried
// first, has been shut down — logo.clearbit.com no longer resolves at all.)
// Favicons are small/low-res, not polished brand marks, and some banks
// aren't indexed — `short`/`color` above are the fallback for those (and for
// any bank whose domain isn't set at all).
export const logoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

// Display label for an account: "HDFC Bank •••• 4821", or just the bank name
// (or custom name, for "Other") when no last-4 was given.
export function accountLabel(a: { bank: string; last4?: string | null; customName?: string | null }): string {
  const base = a.bank === 'OTHER' && a.customName ? a.customName : getBank(a.bank).label;
  return a.last4 ? `${base} •••• ${a.last4}` : base;
}
