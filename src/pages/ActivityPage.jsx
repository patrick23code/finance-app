import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
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

function fmtMoney(n, isIncome) {
  const s = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))
  return isIncome ? `+${s}` : `-${s}`
}

function groupByDate(transactions) {
  const groups = {}
  transactions.forEach(t => {
    const d = t.date || (t.createdAt?.toDate ? t.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    if (!groups[d]) groups[d] = []
    groups[d].push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

export default function ActivityPage({ onNavigate, onEditTransaction }) {
  const { user } = useAuth()
  const { data: transactions, loading } = useCollection('transactions', user?.uid)

  const now = new Date()
  const [offset, setOffset] = useState(0) // 0 = this month, -1 = last month, etc.

  const selectedDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return d
  }, [offset])

  const monthStr = useMemo(() =>
    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`,
    [selectedDate]
  )

  const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const monthTransactions = useMemo(() =>
    transactions.filter(t => (t.date || '').startsWith(monthStr)),
    [transactions, monthStr]
  )

  const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const net = income - expenses

  const totalBalance = useMemo(() => {
    const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
    const allExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    return allIncome - allExpenses
  }, [transactions])

  const grouped = useMemo(() => groupByDate(monthTransactions), [monthTransactions])

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24 relative">
      <div className="max-w-md mx-auto px-4 pt-14">
        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setOffset(o => o - 1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform">
            <ChevronLeft size={18} className="text-stone-600" />
          </button>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">{monthLabel}</h1>
          <button
            onClick={() => setOffset(o => o + 1)}
            disabled={offset >= 0}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRight size={18} className="text-stone-600" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Income</p>
              <p className="text-lg font-bold text-emerald-600">+${income.toLocaleString()}</p>
            </div>
            <div className="w-px bg-stone-100 self-stretch mx-1" />
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Expenses</p>
              <p className="text-lg font-bold text-stone-800">-${expenses.toLocaleString()}</p>
            </div>
            <div className="w-px bg-stone-100 self-stretch mx-1" />
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Balance</p>
              <p className={`text-lg font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {totalBalance >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance)}
              </p>
            </div>
          </div>

        </div>


        {/* Transaction List */}
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">Tap Quick add to log your first transaction</p>
          </div>
        ) : (
          grouped.map(([date, txns]) => (
            <div key={date} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-500 tracking-wide">{formatDateLabel(date)}</span>
                <span className="text-xs text-stone-400">{txns.length} {txns.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {txns.map((t, i) => {
                  const cat = CATEGORY_ICONS[t.category] || CATEGORY_ICONS.other
                  return (
                    <div key={t.id} onClick={() => onEditTransaction?.(t)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-stone-50 ${i < txns.length - 1 ? 'border-b border-stone-100' : ''}`}>
                      <div className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center text-lg flex-shrink-0`}>
                        {cat.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 text-sm">{t.name}</p>
                        <p className="text-xs text-stone-400 truncate">
                          {t.category.charAt(0).toUpperCase() + t.category.slice(1)}
                          {t.cardName && ` · ${t.cardName}`}
                        </p>
                      </div>
                      <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-stone-800'}`}>
                        {fmtMoney(t.amount, t.type === 'income')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-md mx-auto px-4 flex justify-end">
          <button
            onClick={() => onNavigate('add-transaction')}
            className="w-14 h-14 bg-stone-800 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>
    </div>
  )
}
