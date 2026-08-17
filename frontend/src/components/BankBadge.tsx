import { useEffect, useState } from 'react';
import { getInstitution, logoUrl } from '../data/banks';

// Real logo (bank or wallet), auto-populating the instant one is picked.
// Prefers a bundled local asset (`logo`) when we have one — no network
// dependency, always crisp. Otherwise falls back to a favicon fetched by
// domain, and finally to a colored initials badge if that fails too (or for
// "Other"). `type` selects which list `bank` is looked up in — omit for a
// bank (the default).
export function BankBadge({ bank, type, size = 'md' }: { bank: string; type?: string; size?: 'md' | 'lg' }) {
  const b = getInstitution(type, bank);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [bank, type]);

  const dims = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';
  const src = b.logo ?? (b.domain ? logoUrl(b.domain) : undefined);

  if (src && !failed) {
    return (
      <div className={`${dims} rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-1.5`}>
        <img src={src} alt={b.label} onError={() => setFailed(true)}
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
