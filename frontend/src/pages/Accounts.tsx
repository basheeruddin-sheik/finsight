import { useEffect, useState } from 'react';
import {
  getAccounts, createAccount, updateAccount, setDefaultAccount,
  archiveAccount, restoreAccount, transferBetweenAccounts,
} from '../api/accounts';
import type { Account } from '../types';
import { formatAmount, todayStr } from '../utils';
import { Spinner, EmptyState, BottomSheet, ConfirmModal, DateField } from '../components/ui';
import { BANKS, WALLETS, accountLabel } from '../data/banks';
import { BankBadge } from '../components/BankBadge';
import { Landmark, Star, ArrowLeftRight, ChevronDown, Archive, RotateCcw } from 'lucide-react';

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [archived, setArchived] = useState<Account[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [showAdd,   setShowAdd]   = useState(false);
  const [editing,   setEditing]   = useState<Account | null>(null);
  const [showXfer,  setShowXfer]  = useState(false);
  const [confirmArch, setConfirmArch] = useState<Account | null>(null);
  const [error,     setError]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [active, arch] = await Promise.all([getAccounts(), getAccounts(true)]);
      setAccounts(active); setArchived(arch);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleArchive = async (a: Account) => {
    try { await archiveAccount(a.id); setConfirmArch(null); load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Failed to archive'); setConfirmArch(null); }
  };

  const handleRestore = async (a: Account) => {
    try { await restoreAccount(a.id); load(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Failed to restore'); }
  };

  // Credit card balances are a liability (amount owed), not an asset —
  // subtract them instead of adding, so the total reflects actual net worth.
  const totalBalance = accounts.reduce((s, a) => s + (a.type === 'CREDIT_CARD' ? -a.balance : a.balance), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}>
        <h1 className="text-base font-semibold text-slate-900">Accounts</h1>
        {accounts.length >= 2 && (
          <button onClick={() => setShowXfer(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 pl-2.5 pr-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70">
            <ArrowLeftRight size={13} strokeWidth={2.5} /> Transfer
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-rose-400 ml-3 shrink-0">×</button>
        </div>
      )}

      {loading ? <Spinner /> : accounts.length === 0 ? (
        <EmptyState icon={<Landmark size={32} />} title="No accounts yet" description="Add a bank account, wallet, cash, or credit card to track its balance"
          action={
            <button onClick={() => setShowAdd(true)}
              className="mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">
              Add Account
            </button>
          }
        />
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {/* Total across active accounts */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Total balance</p>
              <p className="text-xs text-slate-400 mt-0.5">{accounts.length} account{accounts.length > 1 ? 's' : ''}</p>
            </div>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
              {formatAmount(totalBalance)}
            </p>
          </div>

          {([
            { label: 'Banks',        list: accounts.filter(a => a.type !== 'WALLET' && a.type !== 'CASH' && a.type !== 'CREDIT_CARD') },
            { label: 'Wallets',      list: accounts.filter(a => a.type === 'WALLET') },
            { label: 'Cash',         list: accounts.filter(a => a.type === 'CASH') },
            { label: 'Credit Cards', list: accounts.filter(a => a.type === 'CREDIT_CARD') },
          ] as const).map(({ label, list }) => list.length > 0 && (
            <div key={label}>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">{label} · {list.length}</p>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {list.map((a, i) => {
                  const isCard = a.type === 'CREDIT_CARD';
                  const available = isCard ? round2(a.creditLimit - a.balance) : null;
                  return (
                    <div key={a.id}>
                      {i > 0 && <div className="h-px bg-slate-50 mx-4" />}
                      <button onClick={() => setEditing(a)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50">
                        <BankBadge bank={a.bank} type={a.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-slate-800 truncate">{accountLabel(a)}</p>
                            {a.isDefault && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 shrink-0">
                                <Star size={9} fill="currentColor" strokeWidth={0} /> Default
                              </span>
                            )}
                          </div>
                          {isCard && a.creditLimit > 0 && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatAmount(available!)} available of {formatAmount(a.creditLimit)}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {isCard ? (
                            <>
                              <p className={`text-base font-bold ${a.balance > 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                                {formatAmount(a.balance)}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">outstanding</p>
                            </>
                          ) : (
                            <p className={`text-base font-bold ${a.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                              {formatAmount(a.balance)}
                            </p>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(s => !s)}
                className="w-full flex items-center justify-between px-1 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Archive size={12} strokeWidth={2.5} /> Archived · {archived.length}</span>
                <ChevronDown size={14} className={`transition-transform ${showArchived ? 'rotate-180' : ''}`} />
              </button>
              {showArchived && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-1">
                  {archived.map((a, i) => (
                    <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                      <BankBadge bank={a.bank} type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-500 truncate">{accountLabel(a)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatAmount(a.balance)}</p>
                      </div>
                      <button onClick={() => handleRestore(a)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 active:opacity-70 shrink-0">
                        <RotateCcw size={13} strokeWidth={2} /> Activate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-20 pointer-events-none">
          <div className="max-w-md mx-auto relative">
            <button onClick={() => setShowAdd(true)}
              className="pointer-events-auto absolute right-4 bottom-0 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl">
              +
            </button>
          </div>
        </div>
      )}

      {(showAdd || editing) && (
        <AccountSheet
          account={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={async data => {
            try {
              if (editing) await updateAccount(editing.id, data);
              else await createAccount(data);
              setShowAdd(false); setEditing(null); load();
            } catch (e: any) { throw new Error(e.response?.data?.message ?? 'Failed to save'); }
          }}
          onArchive={editing ? () => { setConfirmArch(editing); setEditing(null); } : undefined}
          onSetDefault={editing && !editing.isDefault ? async () => {
            try { await setDefaultAccount(editing.id); setEditing(null); load(); }
            catch (e: any) { setError(e.response?.data?.message ?? 'Failed to set default'); }
          } : undefined}
        />
      )}

      {showXfer && (
        <TransferSheet accounts={accounts}
          onClose={() => setShowXfer(false)}
          onSaved={() => { setShowXfer(false); load(); }}
        />
      )}

      {confirmArch && (
        <ConfirmModal
          title={`Archive "${accountLabel(confirmArch)}"?`}
          message="It'll be hidden from pickers everywhere. Its transactions stay intact, and you can reactivate it anytime."
          confirmLabel="Archive"
          variant="confirm"
          onConfirm={() => handleArchive(confirmArch)}
          onCancel={() => setConfirmArch(null)}
        />
      )}
    </div>
  );
}

// ── Add / Edit sheet ─────────────────────────────────────────────────────────
function AccountSheet({ account, onClose, onSaved, onArchive, onSetDefault }: {
  account: Account | null;
  onClose: () => void;
  onSaved: (data: { type: string; bank: string; last4?: string; customName?: string; openingBalance: number; creditLimit?: number }) => Promise<void>;
  onArchive?: () => void;
  onSetDefault?: () => Promise<void>;
}) {
  const [type,       setType]       = useState<'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD'>(account?.type ?? 'BANK');
  const [bank,       setBank]       = useState(account?.bank ?? BANKS[0].key);
  const [last4,      setLast4]      = useState(account?.last4 ?? '');
  const [customName, setCustomName] = useState(account?.customName ?? '');
  // The field always shows/edits the CURRENT balance (what you'd see in your
  // bank app right now), never the raw openingBalance — those two drift apart
  // the moment any transaction touches the account, which was confusing (you'd
  // type today's balance and see a stale number in the list). `netFromTxns` is
  // the fixed offset already baked in from transactions logged so far
  // (balance = openingBalance + netFromTxns); on save we back-solve for the
  // openingBalance that makes the new number true, instead of asking the user
  // to do that math themselves.
  const netFromTxns = account ? account.balance - account.openingBalance : 0;
  const [balanceInput, setBalanceInput] = useState(account ? String(account.balance) : '');
  const [limit,      setLimit]      = useState(account ? String(account.creditLimit || '') : '');
  const [saving,     setSaving]     = useState(false);
  const [settingDef, setSettingDef] = useState(false);
  const [error,      setError]      = useState('');

  const usesBankList = type === 'BANK' || type === 'CREDIT_CARD';
  const institutions = type === 'WALLET' ? WALLETS : usesBankList ? BANKS : [];
  const hasAccountNumber = type === 'BANK' || type === 'CREDIT_CARD';

  const changeType = (t: 'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD') => {
    setType(t);
    setBank(t === 'WALLET' ? WALLETS[0].key : t === 'CASH' ? 'CASH' : BANKS[0].key);
  };

  const makeDefault = async () => {
    if (!onSetDefault) return;
    setSettingDef(true); setError('');
    try { await onSetDefault(); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Failed to set default'); setSettingDef(false); }
  };

  const save = async () => {
    if (!bank) { setError(`Select a ${type === 'WALLET' ? 'wallet' : type === 'CREDIT_CARD' ? 'card issuer' : 'bank'}`); return; }
    if (hasAccountNumber && last4 && !/^\d{4}$/.test(last4)) { setError('Last 4 digits should be 4 numbers'); return; }
    setSaving(true); setError('');
    try {
      await onSaved({
        type, bank,
        last4: hasAccountNumber && last4 ? last4 : undefined,
        customName: (bank === 'OTHER' || type === 'CASH' || type === 'CREDIT_CARD') ? customName.trim() || undefined : undefined,
        openingBalance: (Number(balanceInput) || 0) - netFromTxns,
        creditLimit: type === 'CREDIT_CARD' ? Number(limit) || 0 : undefined,
      });
    } catch (e: any) { setError(e.message ?? 'Failed to save'); setSaving(false); }
  };

  return (
    <BottomSheet title={account ? 'Edit Account' : 'Add Account'} onClose={onClose}>
      {/* Icon preview — auto-updates the instant a bank/wallet is picked */}
      <div className="flex justify-center">
        <BankBadge bank={bank} type={type} size="lg" />
      </div>

      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        {(['BANK', 'WALLET', 'CASH', 'CREDIT_CARD'] as const).map(t => (
          <button key={t} onClick={() => changeType(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}>
            {t === 'BANK' ? 'Bank' : t === 'WALLET' ? 'Wallet' : t === 'CASH' ? 'Cash' : 'Card'}
          </button>
        ))}
      </div>

      {account && (
        account.isDefault ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl py-2.5">
            <Star size={13} fill="currentColor" strokeWidth={0} /> This is your default account
          </div>
        ) : onSetDefault && (
          <button onClick={makeDefault} disabled={settingDef}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl py-2.5 active:opacity-70 disabled:opacity-50">
            <Star size={13} strokeWidth={2.5} /> {settingDef ? 'Setting as default…' : 'Set as default account'}
          </button>
        )
      )}

      {type !== 'CASH' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {type === 'WALLET' ? 'Wallet' : type === 'CREDIT_CARD' ? 'Card Issuer' : 'Bank'}
          </p>
          <select value={bank} onChange={e => setBank(e.target.value)}
            className="w-full bg-transparent text-[15px] font-semibold text-slate-800 outline-none">
            {institutions.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
        </div>
      )}

      {(bank === 'OTHER' || type === 'CASH' || type === 'CREDIT_CARD') && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {type === 'CASH' ? 'Name (optional)' : type === 'CREDIT_CARD' ? 'Card Name (optional)' : 'Name'}
          </p>
          <input
            type="text"
            placeholder={
              type === 'CASH' ? 'e.g. Petty Cash'
              : type === 'CREDIT_CARD' ? 'e.g. Regalia, Millennia, Diners Club'
              : type === 'WALLET' ? 'e.g. Store credit'
              : 'e.g. Local bank'
            }
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            className="w-full text-[15px] text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
          {type === 'CREDIT_CARD' && bank !== 'OTHER' && (
            <p className="text-[11px] text-slate-400 mt-1.5">Handy if you have more than one card from the same bank.</p>
          )}
        </div>
      )}

      {/* Wallets and cash don't have an account number */}
      {hasAccountNumber && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Last 4 digits (optional)</p>
          <input type="text" inputMode="numeric" placeholder="1234" value={last4} maxLength={4}
            onChange={e => setLast4(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="w-full text-[15px] font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
        </div>
      )}

      {type === 'CREDIT_CARD' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Credit limit (optional)</p>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-slate-400">₹</span>
            <input type="text" inputMode="decimal" placeholder="0" value={limit}
              onChange={e => setLimit(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
          {type === 'CREDIT_CARD' ? 'Outstanding balance' : 'Current balance'}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-slate-400">₹</span>
          <input type="text" inputMode="decimal" placeholder="0" value={balanceInput}
            onChange={e => setBalanceInput(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {type === 'CREDIT_CARD'
            ? "What you currently owe on this card — right now, matching your card app."
            : "What's in this account right now — type today's real balance, not a historical one."}
        </p>
      </div>

      {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

      <div className="flex gap-3 pb-2">
        <button onClick={onClose} className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {onArchive && !account?.isDefault && (
        <button onClick={onArchive}
          className="w-full py-3 rounded-2xl border border-amber-100 bg-amber-50 text-amber-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80">
          <Archive size={15} strokeWidth={2} /> Archive account
        </button>
      )}
    </BottomSheet>
  );
}

// ── Transfer between two of your own accounts ────────────────────────────────
function TransferSheet({ accounts, onClose, onSaved }: {
  accounts: Account[]; onClose: () => void; onSaved: () => void;
}) {
  const [fromId, setFromId] = useState(accounts.find(a => a.isDefault)?.id ?? accounts[0]?.id ?? '');
  const [toId,   setToId]   = useState('');
  const [amount, setAmount] = useState('');
  const [note,   setNote]   = useState('');
  const [date,   setDate]   = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const amtN = parseFloat(amount) || 0;
  const toOptions = accounts.filter(a => a.id !== fromId);
  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount = accounts.find(a => a.id === toId);

  const save = async () => {
    if (!fromId || !toId) { setError('Pick both accounts'); return; }
    if (fromId === toId)  { setError('Pick two different accounts'); return; }
    if (amtN <= 0)         { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    // Leaving the note blank shouldn't mean a generic, unhelpful "Account
    // transfer" — default to naming the two accounts involved instead.
    const defaultNote = fromAccount && toAccount ? `Transfer: ${accountLabel(fromAccount)} → ${accountLabel(toAccount)}` : undefined;
    try {
      await transferBetweenAccounts({ fromAccountId: fromId, toAccountId: toId, amount: amtN, note: note.trim() || defaultNote, date });
      onSaved();
    } catch (e: any) { setError(e.response?.data?.message ?? 'Failed to transfer'); setSaving(false); }
  };

  return (
    <BottomSheet title="Transfer between accounts" onClose={onClose}>
      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">From</p>
        <select value={fromId} onChange={e => { setFromId(e.target.value); if (e.target.value === toId) setToId(''); }}
          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none">
          {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a)} · {formatAmount(a.balance)}</option>)}
        </select>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">To</p>
        <select value={toId} onChange={e => setToId(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none">
          <option value="">Select account…</option>
          {toOptions.map(a => <option key={a.id} value={a.id}>{accountLabel(a)} · {formatAmount(a.balance)}</option>)}
        </select>
        {toAccount?.type === 'CREDIT_CARD' && (
          <p className="text-[11px] text-slate-400 mt-1.5">This pays down what's owed on the card, not a purchase.</p>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Amount</p>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold text-slate-400">₹</span>
          <input type="text" inputMode="decimal" placeholder="0" value={amount} autoFocus
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full text-xl font-bold text-slate-900 outline-none bg-transparent placeholder:text-slate-300" />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
        <DateField value={date} onChange={setDate} max={todayStr()} />
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Note (optional)</p>
        <input type="text" placeholder="e.g. Moving savings" value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-sm font-semibold text-slate-800 outline-none bg-transparent placeholder:text-slate-300" />
      </div>

      {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

      <div className="flex gap-3 pb-2">
        <button onClick={onClose} className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Transferring…' : 'Transfer'}
        </button>
      </div>
    </BottomSheet>
  );
}
