import { useMemo } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'

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

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
            <ChevronLeft size={20} className="text-stone-600" />
          </button>
          <div>
            {debt.bank && <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">{debt.bank}</p>}
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">{debt.name}</h1>
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
                    return (
                      <div key={t.id} onClick={() => onEditTransaction?.(t)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-stone-50 ${i < txns.length - 1 ? 'border-b border-stone-100' : ''}`}>
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
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
