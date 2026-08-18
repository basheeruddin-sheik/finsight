import { useEffect, useState } from 'react';
import { updateTransaction, deleteTransaction } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { accountLabel } from '../data/banks';
import type { Transaction, PaymentMethod, Person, Account } from '../types';
import { formatAmount, formatTime, formatDateLongUTC, PAYMENT_LABELS } from '../utils';
import { useConfig } from '../context/ConfigContext';
import { BottomSheet, ConfirmModal, DateField } from './ui';
import { ConfigIcon, IconBadge, getIconColor } from './configIcons';
import { Pencil, Trash2 } from 'lucide-react';

const PAYMENTS: PaymentMethod[] = ['PHONEPE', 'GPAY', 'PAYTM', 'CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'WALLET'];

// `createdAt` is a real moment in time — local timezone is correct here,
// unlike `date` (a day-only value), which uses the UTC-safe formatDateLongUTC.
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{children}</span>
    </div>
  );
}

export default function TransactionDetailSheet({ transaction, persons, onClose, onChanged }: {
  transaction: Transaction;
  persons: Person[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { config, activeTypes, activeCategories, getCategoryLabel, getCategoryIcon, getTypeLabel, getTypeIcon, getBehavior } = useConfig();
  const t = transaction;

  const [mode,    setMode]    = useState<'view' | 'edit'>('view');
  const [confirm, setConfirm] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // edit fields
  const [amount,    setAmount]    = useState(String(t.amount));
  const [type,      setType]      = useState(t.type);
  const [category,  setCategory]  = useState(t.category ?? activeCategories[0]?.key ?? '');
  const [payment,   setPayment]   = useState<PaymentMethod>(t.paymentMethod);
  const [date,      setDate]      = useState(t.date.substring(0, 10));
  const [note,      setNote]      = useState(t.note ?? '');
  const [personId,  setPersonId]  = useState(t.personId ?? '');
  const [accountId, setAccountId] = useState(t.accountId ?? '');
  const [accounts,  setAccounts]  = useState<Account[]>([]);

  // Fetch active AND archived accounts — a transaction can reference an
  // account that's since been archived, and we still need its name to show
  // "From"/"To" (or "Account") correctly on old transfers/transactions.
  // Archived ones are filtered back out wherever the user picks a NEW
  // account (they shouldn't be assignable going forward).
  useEffect(() => {
    Promise.all([getAccounts(), getAccounts(true)])
      .then(([active, arch]) => setAccounts([...active, ...arch]))
      .catch(() => {});
  }, []);
  // Legacy transactions (predating accounts) have no accountId — pre-select
  // the default account matching the current payment method's filter,
  // instead of leaving the edit picker blank.
  useEffect(() => {
    if (accounts.length === 0 || accountId) return;
    const filter = payment === 'WALLET' ? 'WALLET' : payment === 'CASH' ? 'CASH' : payment === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'BANK';
    const matching = accounts.filter(a => a.type === filter && !a.archived);
    const def = matching.find(a => a.isDefault) ?? matching[0] ?? accounts.find(a => a.isDefault && !a.archived) ?? accounts.find(a => !a.archived);
    if (def) setAccountId(def.id);
  }, [accounts]);

  // Payment method drives which accounts are selectable — "Wallet"/"Cash"/
  // "Credit Card" show only that kind, everything else shows only banks.
  const accountFilter: 'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD' =
    payment === 'WALLET' ? 'WALLET'
    : payment === 'CASH' ? 'CASH'
    : payment === 'CREDIT_CARD' ? 'CREDIT_CARD'
    : 'BANK';
  useEffect(() => {
    const current = accounts.find(a => a.id === accountId);
    if (current && (current.type !== accountFilter || current.archived)) {
      const first = accounts.find(a => a.type === accountFilter && !a.archived);
      if (first) setAccountId(first.id);
    }
  }, [accountFilter, accounts]);
  const accountEntity = accounts.find(a => a.id === t.accountId);
  const accountName = accountEntity ? accountLabel(accountEntity) : undefined;
  const toAccountEntity = accounts.find(a => a.id === t.toAccountId);
  const toAccountName = toAccountEntity ? accountLabel(toAccountEntity) : undefined;

  const behavior   = getBehavior(t.type);
  const isTransfer = behavior === 'ACCOUNT_TRANSFER';
  const isPositive = behavior === 'INCOME' || behavior === 'RECEIVE_BACK' || behavior === 'DIVEST' || behavior === 'SPLIT_COLLECT';
  const icon       = t.category ? getCategoryIcon(t.category) : getTypeIcon(t.type);

  const typeConf        = config.types.find(x => x.key === type);
  const needsPerson     = typeConf?.requiresPerson ?? false;
  const showCats        = typeConf?.hasCategories  ?? false;
  const filteredPersons = typeConf?.personType === 'FAMILY' ? persons.filter(p => p.type === 'FAMILY') : persons;
  const personName      = t.person?.name ?? persons.find(p => p.id === t.personId)?.name;

  const handleDelete = async () => {
    setConfirm(false); setSaving(true);
    try { await deleteTransaction(t.id); onChanged(); onClose(); }
    catch { setError('Failed to delete. Try again.'); setSaving(false); }
  };

  const handleSave = async () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    if (needsPerson && !personId) { setError('Select a person'); return; }
    setSaving(true); setError('');
    try {
      await updateTransaction(t.id, {
        type: type as any, amount: amt, date,
        category: showCats ? category : undefined,
        paymentMethod: payment,
        personId: needsPerson ? personId : undefined,
        note: note.trim() || undefined,
        accountId: accountId || undefined,
      });
      onChanged(); onClose();
    } catch { setError('Failed to save. Try again.'); setSaving(false); }
  };

  return (
    <>
      <BottomSheet title={mode === 'view' ? 'Transaction' : 'Edit Transaction'} onClose={onClose}>
        {mode === 'view' ? (
          <>
            {/* Hero */}
            <div className="flex flex-col items-center text-center pt-1 pb-2">
              <IconBadge name={icon} size={26} className="w-14 h-14 rounded-2xl mb-3" />
              <p className={`text-3xl font-bold ${isTransfer ? 'text-slate-700' : isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isTransfer ? '' : isPositive ? '+' : '−'}{formatAmount(t.amount)}
              </p>
              <p className="text-sm text-slate-400 mt-1">{t.note || getTypeLabel(t.type)}</p>
            </div>

            {/* Details */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100">
              <Row label="Type">
                <span className="inline-flex items-center gap-1.5">
                  <ConfigIcon name={getTypeIcon(t.type)} size={15} className={getIconColor(getTypeIcon(t.type)).text} />
                  {getTypeLabel(t.type)}
                </span>
              </Row>
              {t.category && <Row label="Category">{getCategoryLabel(t.category)}</Row>}
              {personName && <Row label="Person">{personName}</Row>}
              {behavior === 'DIVEST' && (t.costBasis ?? 0) > 0 && (() => {
                const profit = t.amount - (t.costBasis ?? 0);
                return (
                  <>
                    <Row label="Amount received">{formatAmount(t.amount)}</Row>
                    <Row label="Original invested">{formatAmount(t.costBasis!)}</Row>
                    <Row label={profit >= 0 ? 'Profit' : 'Loss'}>
                      <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                        {profit >= 0 ? '+' : '−'}{formatAmount(Math.abs(profit))}
                      </span>
                    </Row>
                  </>
                );
              })()}
              {isTransfer ? (
                <>
                  {accountName && <Row label="From">{accountName}</Row>}
                  {toAccountName && <Row label="To">{toAccountName}</Row>}
                </>
              ) : (
                <>
                  <Row label="Payment">{PAYMENT_LABELS[t.paymentMethod]}</Row>
                  {accountName && <Row label="Account">{accountName}</Row>}
                </>
              )}
              <Row label="Date">{formatDateLongUTC(t.date)}</Row>
              {t.note && <Row label="Note">{t.note}</Row>}
              {t.createdAt && <Row label="Added on">{longDate(t.createdAt)} · {formatTime(t.createdAt)}</Row>}
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setMode('edit'); setError(''); }}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
                <Pencil size={15} strokeWidth={2} /> Edit
              </button>
              <button onClick={() => setConfirm(true)} disabled={saving}
                className="flex-1 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-500 text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80 disabled:opacity-40">
                <Trash2 size={15} strokeWidth={2} /> Delete
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Amount */}
            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</p>
              <input type="text" inputMode="decimal" value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-3xl font-bold text-slate-900 outline-none bg-transparent" />
            </div>

            {/* Note */}
            <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Note</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full text-[15px] text-slate-800 outline-none bg-transparent" />
            </div>

            {/* Date */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
              <DateField value={date} onChange={setDate} />
            </div>

            {/* Payment */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENTS.map(p => (
                  <button key={p} onClick={() => setPayment(p)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${payment === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {PAYMENT_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            {accounts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Account</p>
                {accounts.filter(a => a.type === accountFilter && !a.archived).length === 0 ? (
                  <p className="text-xs text-rose-500 font-medium">
                    No {accountFilter === 'WALLET' ? 'wallets' : accountFilter === 'CASH' ? 'cash accounts' : accountFilter === 'CREDIT_CARD' ? 'credit cards' : 'bank accounts'} yet — add one, or pick a different payment method.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {accounts.filter(a => a.type === accountFilter && !a.archived).map(a => (
                      <button key={a.id} onClick={() => setAccountId(a.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${accountId === a.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {accountLabel(a)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Type */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {activeTypes.map(x => {
                  const active = type === x.key;
                  return (
                    <button key={x.key} onClick={() => { setType(x.key); setPersonId(''); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      <ConfigIcon name={x.icon} size={15} className={active ? 'text-white' : getIconColor(x.icon).text} />{x.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            {showCats && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</p>
                <div className="grid grid-cols-4 gap-2">
                  {activeCategories.map(c => {
                    const active = category === c.key;
                    return (
                      <button key={c.key} onClick={() => setCategory(c.key)}
                        className={`py-2.5 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                        <ConfigIcon name={c.icon} size={18} className={active ? 'text-white' : getIconColor(c.icon).text} />
                        <span className="text-[10px] font-semibold truncate w-full text-center">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Person */}
            {needsPerson && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {typeConf?.personType === 'FAMILY' ? 'Family Member' : 'Person'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredPersons.map(p => (
                    <button key={p.id} onClick={() => setPersonId(p.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${personId === p.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

            <div className="flex gap-3 pb-2">
              <button onClick={() => { setMode('view'); setError(''); }}
                className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {confirm && (
        <ConfirmModal
          title="Delete Transaction"
          message="This transaction will be permanently removed and cannot be recovered."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
}
