import { useEffect, useState } from 'react';
import { getBorrows, getBorrowSummary, addPayment, settleBorrow, createBorrow, type Borrow, type BorrowSummary } from '../api/borrows';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount, formatDate } from '../utils';

const today = () => new Date().toISOString().split('T')[0];

export default function Borrows() {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [summary, setSummary] = useState<BorrowSummary | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAddBorrow, setShowAddBorrow] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Borrow | null>(null);
  const [loading, setLoading] = useState(true);

  // Add borrow form
  const [ab, setAb] = useState({ personId: '', principal: '', interestRate: '0', startDate: today() });
  // Add payment form
  const [pay, setPay] = useState({ amount: '', date: today(), note: '' });

  const load = async () => {
    setLoading(true);
    const [b, s, p] = await Promise.all([getBorrows(), getBorrowSummary(), getPersons()]);
    setBorrows(b);
    setSummary(s);
    setPersons(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddBorrow = async () => {
    if (!ab.personId || !ab.principal) return;
    await createBorrow({ personId: +ab.personId, principal: +ab.principal, interestRate: +ab.interestRate, startDate: ab.startDate });
    setShowAddBorrow(false);
    setAb({ personId: '', principal: '', interestRate: '0', startDate: today() });
    load();
  };

  const handlePayment = async () => {
    if (!paymentModal || !pay.amount) return;
    await addPayment(paymentModal.id, { amount: +pay.amount, date: pay.date, note: pay.note || undefined });
    setPaymentModal(null);
    setPay({ amount: '', date: today(), note: '' });
    load();
  };

  const handleSettle = async (id: number) => {
    if (!confirm('Mark as fully settled?')) return;
    await settleBorrow(id);
    load();
  };

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-red-100 text-red-600',
    PARTIALLY_RETURNED: 'bg-yellow-100 text-yellow-700',
    SETTLED: 'bg-green-100 text-green-600',
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-3 gap-2 p-4 bg-white border-b border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-400">Lent</p>
            <p className="text-sm font-bold text-gray-800">{formatAmount(summary.totalLent)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Recovered</p>
            <p className="text-sm font-bold text-green-600">{formatAmount(summary.totalRecovered)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="text-sm font-bold text-red-500">{formatAmount(summary.totalOutstanding)}</p>
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading...</p>
        ) : borrows.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No borrows yet.</p>
        ) : (
          borrows.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                <div>
                  <p className="font-medium text-gray-800">{b.person.name}</p>
                  <p className="text-xs text-gray-400">Principal {formatAmount(b.principal)} · {b.interestRate > 0 ? `${b.interestRate}% p.a.` : 'No interest'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-500">{formatAmount(b.totalOwed)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.status] ?? ''}`}>{b.status.replace('_', ' ')}</span>
                </div>
              </div>

              {expanded === b.id && (
                <div className="border-t border-gray-100 p-3 flex flex-col gap-2">
                  {b.payments.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Payments</p>
                      {b.payments.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                          <span className="font-medium text-green-600">+{formatAmount(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.status !== 'SETTLED' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => { setPaymentModal(b); setPay({ amount: '', date: today(), note: '' }); }}
                        className="flex-1 py-2 text-sm bg-gray-900 text-white rounded-xl">Add Payment</button>
                      <button onClick={() => handleSettle(b.id)}
                        className="flex-1 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl">Mark Settled</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAddBorrow(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gray-900 text-white rounded-full text-2xl shadow-lg flex items-center justify-center">
        +
      </button>

      {/* Add Borrow Modal */}
      {showAddBorrow && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Add Borrow</h2>
            <select value={ab.personId} onChange={e => setAb({ ...ab, personId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm">
              <option value="">Select person...</option>
              {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" placeholder="Principal amount (₹)" value={ab.principal}
              onChange={e => setAb({ ...ab, principal: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <input type="number" placeholder="Interest rate % (0 = interest-free)" value={ab.interestRate}
              onChange={e => setAb({ ...ab, interestRate: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <input type="date" value={ab.startDate} onChange={e => setAb({ ...ab, startDate: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddBorrow(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handleAddBorrow} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 z-30 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Add Payment — {paymentModal.person.name}</h2>
            <p className="text-sm text-gray-400">Outstanding: {formatAmount(paymentModal.totalOwed)}</p>
            <input type="number" placeholder="Amount (₹)" value={pay.amount}
              onChange={e => setPay({ ...pay, amount: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <input type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <input type="text" placeholder="Note (optional)" value={pay.note}
              onChange={e => setPay({ ...pay, note: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setPaymentModal(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">Cancel</button>
              <button onClick={handlePayment} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
