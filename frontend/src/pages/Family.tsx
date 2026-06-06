import { useEffect, useState } from 'react';
import { getPersons } from '../api/persons';
import { getTransactions } from '../api/transactions';
import type { Person, Transaction } from '../types';
import { formatAmount, formatDate, currentMonth } from '../utils';
import { Spinner, EmptyState } from '../components/ui';

export default function Family() {
  const [members,  setMembers]  = useState<Person[]>([]);
  const [txns,     setTxns]     = useState<Transaction[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getPersons('FAMILY'), getTransactions({ type: 'FAMILY_TRANSFER' })])
      .then(([p, t]) => { setMembers(p); setTxns(t); })
      .finally(() => setLoading(false));
  }, []);

  const month = currentMonth();
  const totalThisMonth = txns.filter(t => t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
  const totalAllTime   = txns.reduce((s, t) => s + t.amount, 0);
  const txnsFor      = (id: string) => txns.filter(t => t.personId === id);
  const monthlyFor   = (id: string) => txnsFor(id).filter(t => t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-900">Family Transfers</h1>
      </div>

      {/* Summary */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="flex flex-col items-center py-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">This Month</p>
            <p className="text-xl font-bold text-blue-600">{formatAmount(totalThisMonth)}</p>
          </div>
          <div className="flex flex-col items-center py-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">All Time</p>
            <p className="text-xl font-bold text-slate-700">{formatAmount(totalAllTime)}</p>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : members.length === 0 ? (
        <EmptyState icon="👨‍👩‍👦" title="No family members" description="Add family members in People → Manage People" />
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {members.map(m => {
            const memberTxns = txnsFor(m.id);
            const monthTotal = monthlyFor(m.id);
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-slate-50"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{memberTxns.length} transfer{memberTxns.length !== 1 ? 's' : ''} total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-blue-600">{formatAmount(monthTotal)}</p>
                    <p className="text-[10px] text-slate-400">this month</p>
                  </div>
                </div>

                {expanded === m.id && memberTxns.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-3 flex flex-col gap-1">
                    {memberTxns.map((t, i) => (
                      <div key={t.id}>
                        {i > 0 && <div className="h-px bg-slate-50 my-1" />}
                        <div className="flex justify-between items-center py-1">
                          <div>
                            <p className="text-xs font-medium text-slate-600">{formatDate(t.date)}</p>
                            {t.note && <p className="text-[10px] text-slate-400">{t.note}</p>}
                          </div>
                          <p className="text-sm font-bold text-blue-600">{formatAmount(t.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expanded === m.id && memberTxns.length === 0 && (
                  <div className="border-t border-slate-100 px-4 py-4 text-center">
                    <p className="text-xs text-slate-400">No transfers yet</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
