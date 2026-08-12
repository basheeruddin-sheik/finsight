import { useEffect, useState } from 'react';
import { getTransactions } from '../api/transactions';
import { getPersons } from '../api/persons';
import type { Transaction, PaymentMethod, Person } from '../types';
import { formatAmount, formatDate, formatTime, PAYMENT_LABELS, groupByDay, periodRange, todayStr, type Period } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { Spinner, EmptyState, IconCircle, DateField, BottomSheet } from '../components/ui';
import { useIncremental } from '../hooks/useIncremental';
import TransactionDetailSheet from '../components/TransactionDetailSheet';
import { Receipt, SlidersHorizontal, Search, X } from 'lucide-react';

// Small filter chip
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
      }`}>
      {children}
    </button>
  );
}

// Active-filter pill with quick remove
function RemovablePill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold whitespace-nowrap shrink-0">
      {label}
      <button onClick={onClear} className="w-4 h-4 flex items-center justify-center text-indigo-400"><X size={12} strokeWidth={3} /></button>
    </span>
  );
}

function FLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{children}</p>;
}

const PAYMENTS: PaymentMethod[] = ['PHONEPE', 'GPAY', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'OTHER'];
const PAGE = 10;

const PERIODS: { v: Period; label: string }[] = [
  { v: 'this',   label: 'This Month' },
  { v: 'last',   label: 'Last Month' },
  { v: 'q',      label: 'Quarter' },
  { v: '6m',     label: '6 Months' },
  { v: 'year',   label: 'Year' },
  { v: 'custom', label: 'Custom' },
  { v: 'all',    label: 'All Time' },
];

export default function Transactions() {
  const { activeTypes, activeCategories, getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeIcon, getBehavior } = useConfig();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [persons,      setPersons]      = useState<Person[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [detail,       setDetail]       = useState<Transaction | null>(null);

  // filters
  const [period,    setPeriod]    = useState<Period>('this');
  const [cFrom,     setCFrom]     = useState(periodRange('this').from ?? '');
  const [cTo,       setCTo]       = useState(todayStr());
  const [typeF,     setTypeF]     = useState<string>('ALL');
  const [catF,      setCatF]      = useState('');
  const [payF,      setPayF]      = useState('');
  const [search,     setSearch]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = () => {
    setLoading(true);
    const range = period === 'custom' ? { from: cFrom || undefined, to: cTo || undefined } : periodRange(period);
    getTransactions({
      type: typeF === 'ALL' ? undefined : typeF,
      category: catF || undefined,
      search: search.trim() || undefined,
      ...range,
    }).then(setTransactions).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { getPersons().then(setPersons).catch(() => {}); }, []);
  useEffect(() => { const id = setTimeout(load, search ? 300 : 0); return () => clearTimeout(id); },
    [period, typeF, catF, search, cFrom, cTo]); // payment filtered client-side

  const visible = payF ? transactions.filter(t => t.paymentMethod === payF) : transactions;
  const { count, sentinelRef } = useIncremental(visible.length, PAGE);
  const groups  = groupByDay(visible.slice(0, count));
  const activeFilters = (typeF !== 'ALL' ? 1 : 0) + (catF ? 1 : 0) + (payF ? 1 : 0) + (search.trim() ? 1 : 0);

  const clearAll = () => { setTypeF('ALL'); setCatF(''); setPayF(''); setSearch(''); };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-slate-900">Activity</h1>
          <button onClick={() => setShowFilters(true)}
            className={`relative flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors ${
              activeFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600'
            }`}>
            <SlidersHorizontal size={15} strokeWidth={2} /> Filters
            {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">{activeFilters}</span>}
          </button>
        </div>

        {/* Period chips (scrollable) */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
                period === p.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {period === 'custom' && (
          <div className="px-4 pb-3 flex items-end gap-2">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">From</p>
              <DateField value={cFrom} onChange={setCFrom} max={cTo || todayStr()} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">To</p>
              <DateField value={cTo} onChange={setCTo} max={todayStr()} />
            </div>
          </div>
        )}

        {/* Active filter pills (quick-remove) */}
        {activeFilters > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar items-center">
            {typeF !== 'ALL' && <RemovablePill label={getTypeLabel(typeF)} onClear={() => setTypeF('ALL')} />}
            {catF && <RemovablePill label={getCategoryLabel(catF)} onClear={() => setCatF('')} />}
            {payF && <RemovablePill label={PAYMENT_LABELS[payF as PaymentMethod]} onClear={() => setPayF('')} />}
            {search.trim() && <RemovablePill label={`"${search.trim()}"`} onClear={() => setSearch('')} />}
            <button onClick={clearAll} className="text-xs font-semibold text-slate-400 whitespace-nowrap shrink-0">Clear all</button>
          </div>
        )}
      </div>

      {/* Summary line */}
      {!loading && visible.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-xs text-slate-400">{visible.length} transaction{visible.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {loading ? <Spinner /> : visible.length === 0 ? (
        <EmptyState icon={<Receipt size={32} />} title="No transactions" description="Try a different period or filter" />
      ) : (
        <div className="p-4 flex flex-col gap-5">
          {groups.map(g => (
            <div key={g.key}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{g.label}</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {g.items.map((t, i) => {
                  const behavior   = getBehavior(t.type);
                  const isTransfer = behavior === 'ACCOUNT_TRANSFER';
                  const isPositive = behavior === 'INCOME' || behavior === 'RECEIVE_BACK' || behavior === 'DIVEST' || behavior === 'SPLIT_COLLECT';
                  const icon     = t.category ? getCategoryIcon(t.category) : getTypeIcon(t.type);
                  const typeLbl  = t.category ? getCategoryLabel(t.category) : getTypeLabel(t.type);
                  const personName = t.person?.name;
                  // Person-linked rows: lead with who, not the type key.
                  const label = t.note || (personName ?? typeLbl);
                  const sub   = isTransfer
                    ? [typeLbl, formatDate(t.date)].join(' · ')
                    : [personName ? `${typeLbl} · ${personName}` : typeLbl, PAYMENT_LABELS[t.paymentMethod], formatDate(t.date)].join(' · ');
                  return (
                    <button key={t.id} onClick={() => setDetail(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                      <IconCircle icon={icon} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isTransfer ? 'text-slate-700' : isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isTransfer ? '' : isPositive ? '+' : '−'}{formatAmount(t.amount)}
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5 tabular-nums">{formatTime(t.createdAt)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {count < visible.length && (
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Filters sheet */}
      {showFilters && (
        <BottomSheet title="Filters" onClose={() => setShowFilters(false)}>
          <div>
            <FLabel>Search</FLabel>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Note or description…"
                className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder:text-slate-400" />
              {search && <button onClick={() => setSearch('')} className="text-slate-400"><X size={14} strokeWidth={2.5} /></button>}
            </div>
          </div>

          <div>
            <FLabel>Type</FLabel>
            <div className="flex flex-wrap gap-2">
              <Chip active={typeF === 'ALL'} onClick={() => setTypeF('ALL')}>All</Chip>
              {activeTypes.map(t => <Chip key={t.key} active={typeF === t.key} onClick={() => setTypeF(t.key)}>{t.label}</Chip>)}
            </div>
          </div>

          <div>
            <FLabel>Category</FLabel>
            <div className="flex flex-wrap gap-2">
              <Chip active={!catF} onClick={() => setCatF('')}>All</Chip>
              {activeCategories.map(c => <Chip key={c.key} active={catF === c.key} onClick={() => setCatF(c.key)}>{c.label}</Chip>)}
            </div>
          </div>

          <div>
            <FLabel>Payment</FLabel>
            <div className="flex flex-wrap gap-2">
              <Chip active={!payF} onClick={() => setPayF('')}>All</Chip>
              {PAYMENTS.map(p => <Chip key={p} active={payF === p} onClick={() => setPayF(p)}>{PAYMENT_LABELS[p]}</Chip>)}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={clearAll}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">
              Clear all
            </button>
            <button onClick={() => setShowFilters(false)}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
              Show {visible.length} result{visible.length === 1 ? '' : 's'}
            </button>
          </div>
        </BottomSheet>
      )}

      {detail && (
        <TransactionDetailSheet
          transaction={detail}
          persons={persons}
          onClose={() => setDetail(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
