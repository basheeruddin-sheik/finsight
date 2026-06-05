import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBorrows, getBorrowSummary, addPayment, settleBorrow,
  createBorrow, deleteBorrow, type Borrow, type BorrowSummary,
} from '../api/borrows';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount, formatDate } from '../utils';
import FAB from '../components/FAB';

// Use local date — toISOString() is UTC which gives wrong date in IST after midnight
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  PARTIALLY_RETURNED: 'Partial',
  SETTLED: 'Settled',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-600',
  PARTIALLY_RETURNED: 'bg-yellow-100 text-yellow-700',
  SETTLED: 'bg-green-100 text-green-600',
};

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-30 flex items-end"
      onClick={onClose}
    />
  );
}

export default function Borrows() {
  const navigate = useNavigate();

  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [summary, setSummary] = useState<BorrowSummary | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add borrow modal
  const [showAddBorrow, setShowAddBorrow] = useState(false);
  const [ab, setAb] = useState({ personId: '', principal: '', interestRate: '0', startDate: localToday() });
  const [abSaving, setAbSaving] = useState(false);
  const [abError, setAbError] = useState('');

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<Borrow | null>(null);
  const [pay, setPay] = useState({ amount: '', date: localToday(), note: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Settle/delete busy state
  const [busyId, setBusyId] = useState<number | null>(null);

  const initialLoad = async () => {
    setLoading(true);
    try {
      const [b, s, p] = await Promise.all([getBorrows(), getBorrowSummary(), getPersons()]);
      setBorrows(b);
      setSummary(s);
      setPersons(p);
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh — no loading flash, keeps expanded state
  const refresh = async () => {
    try {
      const [b, s] = await Promise.all([getBorrows(), getBorrowSummary()]);
      setBorrows(b);
      setSummary(s);
    } catch {
      // stale data stays; user will see it on next manual reload
    }
  };

  useEffect(() => { initialLoad(); }, []);

  const openAddBorrow = () => {
    setAb({ personId: '', principal: '', interestRate: '0', startDate: localToday() });
    setAbError('');
    setShowAddBorrow(true);
  };

  const handleAddBorrow = async () => {
    if (!ab.personId) { setAbError('Select a person'); return; }
    const principal = Number(ab.principal);
    if (!ab.principal || isNaN(principal) || principal <= 0) { setAbError('Enter a valid amount'); return; }
    setAbSaving(true);
    setAbError('');
    try {
      await createBorrow({
        personId: +ab.personId,
        principal,
        interestRate: Number(ab.interestRate) || 0,
        startDate: ab.startDate,
      });
      setShowAddBorrow(false);
      refresh();
    } catch (e: any) {
      setAbError(e?.response?.data?.message ?? 'Failed to save. Try again.');
    } finally {
      setAbSaving(false);
    }
  };

  const openPaymentModal = (b: Borrow) => {
    setPaymentModal(b);
    setPay({ amount: '', date: localToday(), note: '' });
    setPayError('');
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const amount = Number(pay.amount);
    if (!pay.amount || isNaN(amount) || amount <= 0) { setPayError('Enter a valid amount'); return; }
    setPaySaving(true);
    setPayError('');
    try {
      await addPayment(paymentModal.id, { amount, date: pay.date, note: pay.note || undefined });
      setPaymentModal(null);
      refresh();
    } catch (e: any) {
      setPayError(e?.response?.data?.message ?? 'Failed to save. Try again.');
    } finally {
      setPaySaving(false);
    }
  };

  const handleSettle = async (id: number) => {
    if (!confirm('Mark as fully settled?')) return;
    setBusyId(id);
    try {
      await settleBorrow(id);
      refresh();
    } catch {
      alert('Failed to settle. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this borrow and all its payments? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await deleteBorrow(id);
      setExpanded(null);
      refresh();
    } catch {
      alert('Failed to delete. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = showSettled ? borrows : borrows.filter(b => b.status !== 'SETTLED');
  const settledCount = borrows.filter(b => b.status === 'SETTLED').length;

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
          <p className="text-center text-gray-400 py-8">No borrows yet. Tap + to add one.</p>
        ) : (
          <>
            {visible.map(b => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer active:bg-gray-50"
                  onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{b.person.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatAmount(b.principal)} principal
                      {b.interestRate > 0 ? ` · ${b.interestRate}% p.a.` : ''}
                      {' · '}{formatDate(b.startDate)}
                    </p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className={`font-bold ${b.status === 'SETTLED' ? 'text-gray-400 line-through' : 'text-red-500'}`}>
                      {formatAmount(b.totalOwed)}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] ?? ''}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === b.id && (
                  <div className="border-t border-gray-100 p-3 flex flex-col gap-3">
                    {/* Interest breakdown */}
                    {b.interestRate > 0 && b.status !== 'SETTLED' && (
                      <div className="flex justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <span>Interest accrued</span>
                        <span className="font-medium text-orange-500">+{formatAmount(b.interestOwed)}</span>
                      </div>
                    )}

                    {/* Payment history */}
                    {b.payments.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Payments</p>
                        {b.payments.map(p => (
                          <div key={p.id} className="flex justify-between text-sm py-0.5">
                            <span className="text-gray-500">{formatDate(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                            <span className="font-medium text-green-600">+{formatAmount(p.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-1 mt-0.5">
                          <span>Total paid</span>
                          <span className="font-medium">{formatAmount(b.totalPaid)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {b.status !== 'SETTLED' && (
                        <>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => openPaymentModal(b)}
                            className="flex-1 py-2 text-sm bg-gray-900 text-white rounded-xl disabled:opacity-50"
                          >
                            Add Payment
                          </button>
                          <button
                            disabled={busyId === b.id}
                            onClick={() => handleSettle(b.id)}
                            className="flex-1 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl disabled:opacity-50"
                          >
                            {busyId === b.id ? '...' : 'Mark Settled'}
                          </button>
                        </>
                      )}
                      <button
                        disabled={busyId === b.id}
                        onClick={() => handleDelete(b.id)}
                        className="py-2 px-3 text-sm border border-red-100 text-red-400 rounded-xl disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Show/hide settled toggle */}
            {settledCount > 0 && (
              <button
                onClick={() => setShowSettled(v => !v)}
                className="text-xs text-gray-400 text-center py-2"
              >
                {showSettled ? `Hide ${settledCount} settled` : `Show ${settledCount} settled borrow${settledCount > 1 ? 's' : ''}`}
              </button>
            )}
          </>
        )}
      </div>

      <FAB onClick={openAddBorrow} />

      {/* Add Borrow Modal */}
      {showAddBorrow && (
        <>
          <Backdrop onClose={() => !abSaving && setShowAddBorrow(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl max-w-md mx-auto flex flex-col gap-4 p-5 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">Add Borrow</h2>

            {persons.length === 0 ? (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-sm text-gray-500 text-center">
                  No people added yet. Add friends or family first.
                </p>
                <button
                  onClick={() => { setShowAddBorrow(false); navigate('/persons'); }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm"
                >
                  Go to People
                </button>
              </div>
            ) : (
              <>
                <select
                  value={ab.personId}
                  onChange={e => setAb({ ...ab, personId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                >
                  <option value="">Select person...</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Principal amount"
                    value={ab.principal}
                    onChange={e => setAb({ ...ab, principal: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-3 pl-7 text-sm"
                  />
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Interest rate % per year (0 = interest-free)"
                  value={ab.interestRate}
                  onChange={e => setAb({ ...ab, interestRate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                />
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Start date</label>
                  <input
                    type="date"
                    value={ab.startDate}
                    onChange={e => setAb({ ...ab, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm"
                  />
                </div>
                {abError && <p className="text-sm text-red-500">{abError}</p>}
                <div className="flex gap-2 pb-1">
                  <button
                    onClick={() => setShowAddBorrow(false)}
                    disabled={abSaving}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBorrow}
                    disabled={abSaving}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm disabled:opacity-50"
                  >
                    {abSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <>
          <Backdrop onClose={() => !paySaving && setPaymentModal(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl max-w-md mx-auto flex flex-col gap-4 p-5 max-h-[85vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-semibold">Add Payment</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {paymentModal.person.name} · outstanding {formatAmount(paymentModal.totalOwed)}
              </p>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Amount"
                value={pay.amount}
                onChange={e => setPay({ ...pay, amount: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 pl-7 text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date</label>
              <input
                type="date"
                value={pay.date}
                onChange={e => setPay({ ...pay, date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Note (optional)"
              value={pay.note}
              onChange={e => setPay({ ...pay, note: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm"
            />
            {payError && <p className="text-sm text-red-500">{payError}</p>}
            <div className="flex gap-2 pb-1">
              <button
                onClick={() => setPaymentModal(null)}
                disabled={paySaving}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={paySaving}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm disabled:opacity-50"
              >
                {paySaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
