import { useEffect, useState } from 'react';
import { getBank, logoUrl } from '../data/banks';

// Real bank logo (fetched by domain), auto-populating the instant a bank is
// picked. Falls back to a colored initials badge if the logo fails to load
// (network hiccup, or a bank whose logo isn't available) or for "Other".
export function BankBadge({ bank, size = 'md' }: { bank: string; size?: 'md' | 'lg' }) {
  const b = getBank(bank);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [bank]);

  const dims = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  if (b.domain && !failed) {
    return (
      <div className={`${dims} rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-1.5`}>
        <img src={logoUrl(b.domain)} alt={b.label} onError={() => setFailed(true)}
          className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className={`${dims} ${size === 'lg' ? 'text-base' : 'text-[10px]'} rounded-full ${b.color} flex items-center justify-center text-white font-bold shrink-0 leading-none px-1`}>
      {b.short}
    </div>
  );
}
