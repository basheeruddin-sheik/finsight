import { useEffect, useState } from 'react';
import { getPersons } from '../api/persons';
import { getTransactions } from '../api/transactions';
import type { Person, Transaction } from '../types';
import { formatAmount, formatDate, currentMonth } from '../utils';

export default function Family() {
  const [members, setMembers] = useState<Person[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPersons('FAMILY'),
      getTransactions({ type: 'FAMILY_TRANSFER' }),
    ]).then(([p, t]) => {
      setMembers(p);
      setTxns(t);
    }).finally(() => setLoading(false));
  }, []);

  const month = currentMonth();
  const totalThisMonth = txns
    .filter(t => t.date.startsWith(month))
    .reduce((s, t) => s + t.amount, 0);

  const totalAllTime = txns.reduce((s, t) => s + t.amount, 0);

  const txnsFor = (personId: number) => txns.filter(t => t.personId === personId);

  const monthlyFor = (personId: number) =>
    txnsFor(personId).filter(t => t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 p-8">Loading...</div>;

  return (
    <div className="flex flex-col pb-24">
      {/* Totals header */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-white border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-400">This month</p>
          <p className="text-xl font-bold text-blue-600">{formatAmount(totalThisMonth)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">All time</p>
          <p className="text-xl font-bold text-gray-700">{formatAmount(totalAllTime)}</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {members.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No family members yet. Add them in People.</p>
        ) : (
          members.map(m => {
            const memberTxns = txnsFor(m.id);
            const monthTotal = monthlyFor(m.id);
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-3 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                  <div>
                    <p className="font-medium text-gray-800">{m.name}</p>
                    <p className="text-xs text-gray-400">{memberTxns.length} transfers total</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{formatAmount(monthTotal)}</p>
                    <p className="text-xs text-gray-400">this month</p>
                  </div>
                </div>

                {expanded === m.id && memberTxns.length > 0 && (
                  <div className="border-t border-gray-100 p-3 flex flex-col gap-1">
                    {memberTxns.map(t => (
                      <div key={t.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-500">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</span>
                        <span className="font-medium text-blue-600">{formatAmount(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
