import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getBorrows, getBorrowSummary, addPayment, settleBorrow,
  createBorrow, deleteBorrow, type Borrow, type BorrowSummary,
} from '../api/borrows';
import { getPersons } from '../api/persons';
import type { Person } from '../types';
import { formatAmount, formatDate } from '../utils';
import { Spinner, EmptyState, BottomSheet, StatusBadge, ConfirmModal } from '../components/ui';

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Borrows() {
  const navigate = useNavigate();

  const [borrows,      setBorrows]     = useState<Borrow[]>([]);
  const [summary,      setSummary]     = useState<BorrowSummary | null>(null);
  const [persons,      setPersons]     = useState<Person[]>([]);
  const [expanded,     setExpanded]    = useState<string | null>(null);
  const [showSettled,  setShowSettled] = useState(false);
  const [loading,      setLoading]     = useState(true);
  const [busyId,       setBusyId]      = useState<string | null>(null);

  const [showAddBorrow, setShowAddBorrow] = useState(false);
  const [ab,    setAb]     = useState({ personId: '', principal: '', interestRate: '0', startDate: localToday() });
  const [abSaving, setAbSaving] = useState(false);
  const [abError,  setAbError]  = useState('');

  const [paymentModal, setPaymentModal] = useState<Borrow | null>(null);
  const [pay,      setPay]      = useState({ amount: '', date: localToday(), note: '' });
  const [paySaving,setPaySaving]= useState(false);
  const [payError, setPayError] = useState('');

  type ConfirmState = { title: string; message: string; confirmLabel: string; variant: 'danger' | 'confirm'; action: () => void };
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  const initialLoad = async () => {
    setLoading(true);
    try {
      const [b, s, p] = await Promise.all([getBorrows(), getBorrowSummary(), getPersons()]);
      setBorrows(b); setSummary(s); setPersons(p);
    } finally { setLoading(false); }
  };

  const refresh = async () => {
    try {
      const [b, s] = await Promise.all([getBorrows(), getBorrowSummary()]);
      setBorrows(b); setSummary(s);
    } catch {}
  };

  useEffect(() => { initialLoad(); }, []);

  const handleAddBorrow = async () => {
    if (!ab.personId) { setAbError('Select a person'); return; }
    const principal = Number(ab.principal);
    if (!ab.principal || isNaN(principal) || principal <= 0) { setAbError('Enter a valid amount'); return; }
    setAbSaving(true); setAbError('');
    try {
      await createBorrow({ personId: ab.personId, principal, interestRate: Number(ab.interestRate) || 0, startDate: ab.startDate });
      setShowAddBorrow(false);
      setAb({ personId: '', principal: '', interestRate: '0', startDate: localToday() });
      refresh();
    } catch (e: any) {
      setAbError(e?.response?.data?.message ?? 'Failed to save. Try again.');
    } finally { setAbSaving(false); }
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const amount = Number(pay.amount);
    if (!pay.amount || isNaN(amount) || amount <= 0) { setPayError('Enter a valid amount'); return; }
    setPaySaving(true); setPayError('');
    try {
      await addPayment(paymentModal.id, { amount, date: pay.date, note: pay.note || undefined });
      setPaymentModal(null);
      refresh();
    } catch (e: any) {
      setPayError(e?.response?.data?.message ?? 'Failed to save. Try again.');
    } finally { setPaySaving(false); }
  };

  const handleSettle = async (id: string) => {
    setBusyId(id);
    try { await settleBorrow(id); refresh(); }
    catch { alert('Failed to settle. Try again.'); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try { await deleteBorrow(id); setExpanded(null); refresh(); }
    catch { alert('Failed to delete. Try again.'); }
    finally { setBusyId(null); }
  };

  const confirmSettle = (id: string) => setConfirmModal({
    title: 'Mark as Settled',
    message: 'This will mark the borrow as fully settled. You can still view it in the settled list.',
    confirmLabel: 'Mark Settled',
    variant: 'confirm',
    action: () => handleSettle(id),
  });

  const confirmDelete = (id: string) => setConfirmModal({
    title: 'Delete Borrow',
    message: 'This will permanently delete the borrow and all its payment records.',
    confirmLabel: 'Delete',
    variant: 'danger',
    action: () => handleDelete(id),
  });

  const visible = showSettled ? borrows : borrows.filter(b => b.status !== 'SETTLED');
  const settledCount = borrows.filter(b => b.status === 'SETTLED').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-slate-900">Borrows</h1>
      </div>

      {/* Summary header */}
      {summary && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <SummaryCell label="Lent" value={formatAmount(summary.totalLent)} color="text-slate-800" />
            <SummaryCell label="Recovered" value={formatAmount(summary.totalRecovered)} color="text-emerald-600" />
            <SummaryCell label="Outstanding" value={formatAmount(summary.totalOutstanding)} color="text-rose-500" />
          </div>
          {summary.activeCount > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <p className="text-xs text-slate-400">{summary.activeCount} active borrow{summary.activeCount > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}

      {loading ? <Spinner /> : borrows.length === 0 ? (
        <EmptyState icon="🤝" title="No borrows yet" description="Tap + to record money you've lent to someone"
          action={
            <button onClick={() => setShowAddBorrow(true)}
              className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold">
              Add Borrow
            </button>
          }
        />
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {visible.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Card header — tappable */}
              <div className="flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-slate-50"
                onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600 shrink-0">
                  {b.person.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{b.person.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatAmount(b.principal)} · {formatDate(b.startDate)}
                    {b.interestRate > 0 ? ` · ${b.interestRate}% p.a.` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className={`text-sm font-bold ${b.status === 'SETTLED' ? 'text-slate-400 line-through' : 'text-rose-500'}`}>
                    {formatAmount(b.totalOwed)}
                  </p>
                  <StatusBadge status={b.status} />
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === b.id && (
                <div className="border-t border-slate-100 px-4 py-4 flex flex-col gap-4">
                  {/* Interest */}
                  {b.interestRate > 0 && b.status !== 'SETTLED' && (
                    <div className="flex justify-between items-center bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                      <p className="text-xs font-medium text-amber-700">Interest accrued</p>
                      <p className="text-sm font-bold text-amber-600">+{formatAmount(b.interestOwed)}</p>
                    </div>
                  )}

                  {/* Payment history */}
                  {b.payments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment History</p>
                      <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                        {b.payments.map((p, i) => (
                          <div key={p.id}>
                            {i > 0 && <div className="h-px bg-slate-100 mx-3" />}
                            <div className="flex justify-between items-center px-3 py-2.5">
                              <div>
                                <p className="text-xs font-medium text-slate-700">{formatDate(p.date)}</p>
                                {p.note && <p className="text-[10px] text-slate-400">{p.note}</p>}
                              </div>
                              <p className="text-sm font-bold text-emerald-600">+{formatAmount(p.amount)}</p>
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-slate-200 flex justify-between px-3 py-2">
                          <p className="text-xs text-slate-400">Total paid</p>
                          <p className="text-xs font-bold text-slate-600">{formatAmount(b.totalPaid)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {b.status !== 'SETTLED' && (
                      <>
                        <button disabled={busyId === b.id} onClick={() => { setPaymentModal(b); setPay({ amount: '', date: localToday(), note: '' }); setPayError(''); }}
                          className="flex-1 py-2.5 text-sm font-semibold bg-slate-900 text-white rounded-xl disabled:opacity-40">
                          + Payment
                        </button>
                        <button disabled={busyId === b.id} onClick={() => confirmSettle(b.id)}
                          className="flex-1 py-2.5 text-sm font-semibold border border-emerald-200 text-emerald-600 rounded-xl bg-emerald-50 disabled:opacity-40">
                          {busyId === b.id ? '…' : 'Settle'}
                        </button>
                      </>
                    )}
                    <button disabled={busyId === b.id} onClick={() => confirmDelete(b.id)}
                      className="py-2.5 px-3 text-sm font-semibold border border-rose-200 text-rose-400 rounded-xl bg-rose-50 disabled:opacity-40">
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {settledCount > 0 && (
            <button onClick={() => setShowSettled(v => !v)}
              className="py-2.5 text-xs font-semibold text-slate-400 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              {showSettled ? `Hide ${settledCount} settled` : `Show ${settledCount} settled borrow${settledCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { setAb({ personId: '', principal: '', interestRate: '0', startDate: localToday() }); setAbError(''); setShowAddBorrow(true); }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20">
        +
      </button>

      {/* Add Borrow */}
      {showAddBorrow && (
        <BottomSheet title="Add Borrow" onClose={() => !abSaving && setShowAddBorrow(false)}>
          {persons.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-4">No people added yet.</p>
              <button onClick={() => { setShowAddBorrow(false); navigate('/persons'); }}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-semibold">
                Go to People
              </button>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 rounded-2xl border border-slate-100">
                <select value={ab.personId} onChange={e => setAb({ ...ab, personId: e.target.value })}
                  className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 outline-none">
                  <option value="">Select person…</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Principal Amount (₹)</p>
                <input type="number" inputMode="decimal" placeholder="0" value={ab.principal}
                  onChange={e => setAb({ ...ab, principal: e.target.value })}
                  className="w-full text-2xl font-bold text-slate-900 outline-none bg-transparent" />
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Interest Rate % / year (0 = interest-free)</p>
                <input type="number" inputMode="decimal" placeholder="0" value={ab.interestRate}
                  onChange={e => setAb({ ...ab, interestRate: e.target.value })}
                  className="w-full text-lg font-semibold text-slate-900 outline-none bg-transparent" />
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                <input type="date" value={ab.startDate} onChange={e => setAb({ ...ab, startDate: e.target.value })}
                  className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
              </div>

              {abError && <p className="text-sm text-rose-500 font-medium">{abError}</p>}

              <div className="flex gap-3 pb-2">
                <button onClick={() => setShowAddBorrow(false)} disabled={abSaving}
                  className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 disabled:opacity-40">
                  Cancel
                </button>
                <button onClick={handleAddBorrow} disabled={abSaving}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {abSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
        </BottomSheet>
      )}

      {/* Add Payment */}
      {paymentModal && (
        <BottomSheet
          title="Record Payment"
          onClose={() => !paySaving && setPaymentModal(null)}
        >
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700">{paymentModal.person.name}</p>
            <p className="text-sm text-amber-600">Outstanding: {formatAmount(paymentModal.totalOwed)}</p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Amount Received (₹)</p>
            <input type="number" inputMode="decimal" placeholder="0" value={pay.amount} autoFocus
              onChange={e => setPay({ ...pay, amount: e.target.value })}
              className="w-full text-2xl font-bold text-slate-900 outline-none bg-transparent" />
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Date</p>
            <input type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Note (optional)</p>
            <input type="text" placeholder="e.g. partial return, full settlement…" value={pay.note}
              onChange={e => setPay({ ...pay, note: e.target.value })}
              className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
          </div>

          {payError && <p className="text-sm text-rose-500 font-medium">{payError}</p>}

          <div className="flex gap-3 pb-2">
            <button onClick={() => setPaymentModal(null)} disabled={paySaving}
              className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 disabled:opacity-40">
              Cancel
            </button>
            <button onClick={handlePayment} disabled={paySaving}
              className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
              {paySaving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </BottomSheet>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          variant={confirmModal.variant}
          onConfirm={() => { const action = confirmModal.action; setConfirmModal(null); action(); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center py-4 px-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
