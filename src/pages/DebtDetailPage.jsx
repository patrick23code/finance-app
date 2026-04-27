import { useMemo, useState } from 'react'
import { ChevronLeft, Trash2, Edit2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useCollection, deleteDocument, updateDocument } from '../hooks/useFirestore'
import { useSwipeDelete } from '../hooks/useSwipeDelete'
import BankLogo from '../components/BankLogo'
import IssuerCombobox from '../components/IssuerCombobox'

const CATEGORY_ICONS = {
  cigarettes: { emoji: '🚬', color: 'bg-stone-600' },
  gas: { emoji: '⛽', color: 'bg-red-500' },
  groceries: { emoji: '🛒', color: 'bg-green-600' },
  food: { emoji: '🍔', color: 'bg-orange-500' },
  coffee: { emoji: '☕', color: 'bg-amber-700' },
  transport: { emoji: '🚗', color: 'bg-blue-500' },
  entertainment: { emoji: '🎬', color: 'bg-purple-500' },
  health: { emoji: '💊', color: 'bg-pink-500' },
  shopping: { emoji: '🛍️', color: 'bg-yellow-500' },
  utilities: { emoji: '💡', color: 'bg-cyan-500' },
  rent: { emoji: '🏠', color: 'bg-teal-600' },
  salary: { emoji: '💰', color: 'bg-emerald-500' },
  freelance: { emoji: '💻', color: 'bg-indigo-500' },
  other: { emoji: '📦', color: 'bg-stone-400' },
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function groupByDate(txns) {
  const groups = {}
  txns.forEach(t => {
    const d = t.date || new Date().toISOString().split('T')[0]
    if (!groups[d]) groups[d] = []
    groups[d].push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function DebtDetailPage({ debt, onBack, onEditTransaction }) {
  const { user } = useAuth()
  const { data: transactions } = useCollection('transactions', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const { swiped, setSwiped, handlers } = useSwipeDelete()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const related = useMemo(() => {
    return transactions.filter(t =>
      t.sourceId === debt.id ||
      t.cardId === debt.id ||
      t.toId === debt.id ||
      (t.cardName && t.cardName === debt.name)
    )
  }, [transactions, debt])

  // payments to this card (toId) count as positive; charges count as expenses
  const totalSpent = related
    .filter(t => t.toId !== debt.id && t.type === 'expense')
    .reduce((s, t) => s + (t.amount || 0), 0)
  const grouped = useMemo(() => groupByDate(related), [related])

  const isCC = debt.type === 'credit_card'
  const isAccount = ['checking', 'savings', 'cash'].includes(debt.type)
  const utilPct = isCC && debt.creditLimit ? Math.min(100, (debt.remaining / debt.creditLimit) * 100) : null

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDocument('debts', debt.id)
      onBack()
    } catch (e) {
      console.warn('Delete failed:', e)
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
              <ChevronLeft size={20} className="text-stone-600" />
            </button>
            <div className="flex items-center gap-2">
              <BankLogo bankId={debt.issuerId} bankName={debt.bank} size={36} />
              <div>
                {debt.bank && <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">{debt.bank}</p>}
                <h1 className="text-xl font-bold text-stone-800 tracking-tight">{debt.name}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <Edit2 size={18} className="text-blue-600" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <Trash2 size={18} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* Summary Card — hidden for bank accounts */}
        {!isAccount && <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
                {isCC ? 'Current balance' : 'Remaining'}
              </p>
              <p className="text-3xl font-bold text-stone-800">{fmt(debt.remaining)}</p>
            </div>
            {isCC && debt.creditLimit && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Limit</p>
                <p className="text-lg font-bold text-stone-500">{fmt(debt.creditLimit)}</p>
              </div>
            )}
            {!isCC && debt.monthly && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Monthly</p>
                <p className="text-lg font-bold text-stone-500">{fmt(debt.monthly)}</p>
              </div>
            )}
          </div>

          {isCC && utilPct !== null && (
            <div className="mt-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => {
                  const filled = i < Math.round((utilPct / 100) * 20)
                  return <div key={i} className="flex-1 h-1.5 rounded-sm" style={{ backgroundColor: filled ? '#22c55e' : '#e7e5e4' }} />
                })}
              </div>
              <p className="text-xs text-stone-400 mt-1">{Math.round(utilPct)}% used · {fmt(debt.creditLimit - debt.remaining)} available</p>
            </div>
          )}

          <div className="flex gap-4 mt-3 pt-3 border-t border-stone-100">
            {debt.apr && <div><p className="text-[10px] text-stone-400 uppercase tracking-wide">APR</p><p className="font-semibold text-stone-700 text-sm">{debt.apr}%</p></div>}
            {debt.endDate && <div><p className="text-[10px] text-stone-400 uppercase tracking-wide">End date</p><p className="font-semibold text-stone-700 text-sm">{debt.endDate}</p></div>}
            {debt.last4 && <div><p className="text-[10px] text-stone-400 uppercase tracking-wide">Card</p><p className="font-semibold text-stone-700 text-sm">···{debt.last4}</p></div>}
          </div>
        </div>}

        {/* Transactions */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">Transactions</span>
          {totalSpent > 0 && <span className="text-xs text-stone-400">-{fmt(totalSpent)} total</span>}
        </div>

        {grouped.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-stone-400 text-sm">No transactions linked to this {isCC ? 'card' : 'loan'} yet</p>
          </div>
        ) : (
          grouped.map(([date, txns]) => {
            const d = new Date(date + 'T00:00:00')
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
            return (
              <div key={date} className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-500">{label}</span>
                  <span className="text-xs text-stone-400">{txns.length} {txns.length === 1 ? 'entry' : 'entries'}</span>
                </div>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  {txns.map((t, i) => {
                    const cat = CATEGORY_ICONS[t.category] || CATEGORY_ICONS.other
                    const isPayment = t.toId === debt.id
                    const isSwipedOpen = swiped === t.id

                    async function handleDelete() {
                      try {
                        if (t.sourceId && t.sourceType) {
                          if (t.sourceType === 'card') {
                            const card = debts.find(d => d.id === t.sourceId)
                            if (card) {
                              const reverseAmount = t.type === 'expense'
                                ? (card.remaining || 0) - t.amount
                                : (card.remaining || 0) + t.amount
                              await updateDocument('debts', t.sourceId, { remaining: reverseAmount })
                            }
                          } else if (t.sourceType === 'account') {
                            const account = accounts.find(a => a.id === t.sourceId)
                            if (account) {
                              const reverseBalance = t.type === 'expense'
                                ? (account.balance || 0) + t.amount
                                : Math.max(0, (account.balance || 0) - t.amount)
                              await updateDocument('accounts', t.sourceId, { balance: reverseBalance })
                            }
                          }
                        }
                        await deleteDocument('transactions', t.id)
                        setSwiped(null)
                      } catch (e) {
                        console.warn('Delete failed:', e)
                      }
                    }

                    return (
                      <div key={t.id} className={`relative overflow-hidden ${i < txns.length - 1 ? 'border-b border-stone-100' : ''}`}
                        onTouchStart={(e) => handlers.onTouchStart(t.id, e)}
                        onTouchMove={(e) => handlers.onTouchMove(t.id, e)}
                        onTouchEnd={() => handlers.onTouchEnd(t.id)}
                      >
                        <div onClick={() => onEditTransaction?.(t)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-stone-50 transition-transform ${isSwipedOpen ? '-translate-x-16' : ''}`}>
                          <div className={`w-10 h-10 rounded-full ${isPayment ? 'bg-emerald-100' : cat.color} flex items-center justify-center text-lg flex-shrink-0`}>
                            {isPayment ? '💳' : cat.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-stone-800 text-sm">{t.name}</p>
                            <p className="text-xs text-stone-400">
                              {isPayment ? 'Payment' : t.category.charAt(0).toUpperCase() + t.category.slice(1)}
                            </p>
                          </div>
                          <p className={`font-semibold text-sm ${isPayment || t.type === 'income' ? 'text-emerald-600' : 'text-stone-800'}`}>
                            {isPayment || t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                          </p>
                        </div>
                        {isSwipedOpen && (
                          <button onClick={handleDelete} className="absolute right-0 top-0 h-full bg-red-500 text-white px-4 flex items-center justify-center font-semibold">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {confirmDelete && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={() => setConfirmDelete(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
            <div className="max-w-md mx-auto px-4 pt-4 pb-20">
              <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-6" />
              <div className="bg-red-50 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-600 mb-4">Delete {isCC ? 'credit card' : isAccount ? 'account' : 'debt'}?</p>
                <p className="text-xs text-red-500 mb-4">This will delete <strong>{debt.name}</strong> and all its linked transactions.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {showEdit && (
        <EditDebtSheet debt={debt} onClose={() => setShowEdit(false)} />
      )}
    </div>
  )
}

function EditDebtSheet({ debt, onClose }) {
  const isCC = debt.type === 'credit_card'
  const isAccount = ['checking', 'savings', 'cash'].includes(debt.type)
  const [name, setName] = useState(debt.name || '')
  const [issuer, setIssuer] = useState(debt.issuerId ? { id: debt.issuerId, name: debt.bank } : null)
  const [last4, setLast4] = useState(debt.last4 || '')
  const [remaining, setRemaining] = useState(String(debt.remaining ?? ''))
  const [creditLimit, setCreditLimit] = useState(String(debt.creditLimit ?? ''))
  const [apr, setApr] = useState(String(debt.apr ?? ''))
  const [monthly, setMonthly] = useState(String(debt.monthly ?? ''))
  const [dueDay, setDueDay] = useState(String(debt.dueDay ?? ''))
  const [endDate, setEndDate] = useState(debt.endDate || '')
  const [originalAmount, setOriginalAmount] = useState(String(debt.originalAmount ?? ''))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        name,
        issuerId: issuer?.id || null,
        bank: issuer?.name || null,
      }
      if (isCC) {
        payload.last4 = last4 || null
        payload.remaining = parseFloat(remaining) || 0
        payload.creditLimit = parseFloat(creditLimit) || null
        payload.apr = parseFloat(apr) || null
        payload.monthly = parseFloat(monthly) || null
        payload.dueDay = parseInt(dueDay) || null
      } else {
        payload.remaining = parseFloat(remaining) || 0
        payload.originalAmount = parseFloat(originalAmount) || null
        payload.apr = parseFloat(apr) || null
        payload.monthly = parseFloat(monthly) || null
        payload.dueDay = parseInt(dueDay) || null
        payload.endDate = endDate || null
      }
      await updateDocument('debts', debt.id, payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-slate-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-slate-800">Edit {isCC ? 'card' : 'debt'}</h2>
            <button onClick={handleSave} disabled={saving || !name}
              className="text-blue-600 font-semibold text-[15px] disabled:text-slate-300">Save</button>
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Name">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                placeholder="e.g. Freedom Card" />
            </Field>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Issuer</p>
              <IssuerCombobox value={issuer} onChange={setIssuer} />
            </div>

            {isCC && (
              <Field label="Last 4 digits">
                <input type="text" maxLength="4" value={last4} onChange={e => setLast4(e.target.value)}
                  className="w-full text-[15px] font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                  placeholder="1234" />
              </Field>
            )}

            <Field label={isCC ? 'Current balance' : 'Remaining'}>
              <DollarInput value={remaining} onChange={setRemaining} />
            </Field>

            {isCC && (
              <Field label="Credit limit">
                <DollarInput value={creditLimit} onChange={setCreditLimit} />
              </Field>
            )}

            {!isCC && (
              <Field label="Original amount">
                <DollarInput value={originalAmount} onChange={setOriginalAmount} />
              </Field>
            )}

            <Field label="APR (%)">
              <input type="number" inputMode="decimal" value={apr} onChange={e => setApr(e.target.value)}
                className="w-full text-[15px] font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                placeholder="0.00" />
            </Field>

            <Field label={isCC ? 'Min. monthly payment' : 'Monthly payment'}>
              <DollarInput value={monthly} onChange={setMonthly} />
            </Field>

            <Field label="Due day of month">
              <input type="number" min="1" max="31" inputMode="numeric" value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full text-[15px] font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                placeholder="15" />
            </Field>

            {!isCC && (
              <Field label="End date">
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full text-[15px] font-semibold text-slate-800 bg-transparent outline-none" />
              </Field>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

function Field({ label, children }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}

function DollarInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-2xl font-bold text-slate-300">$</span>
      <input type="number" inputMode="decimal" placeholder="0.00"
        value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 text-2xl font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-200" />
    </div>
  )
}
