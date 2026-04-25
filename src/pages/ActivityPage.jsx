import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, deleteDocument, updateDocument } from '../hooks/useFirestore'
import { useSwipeDelete } from '../hooks/useSwipeDelete'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
const CATEGORY_MAP = Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, c]))
const DEFAULT_CAT = { emoji: '📦', color: 'bg-stone-400' }

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
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const { swiped, setSwiped, handlers } = useSwipeDelete()

  const now = new Date()
  const [offset, setOffset] = useState(0) // 0 = this month, -1 = last month, etc.
  const [selectedDay, setSelectedDay] = useState(null) // null = show all month, or YYYY-MM-DD to filter

  const selectedDate = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return d
  }, [offset])

  const monthStr = useMemo(() =>
    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`,
    [selectedDate]
  )

  const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const monthTransactions = useMemo(() => {
    let filtered = transactions.filter(t => (t.date || '').startsWith(monthStr))
    if (selectedDay) {
      filtered = filtered.filter(t => t.date === selectedDay)
    }
    return filtered
  }, [transactions, monthStr, selectedDay])

  const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const net = income - expenses

  const totalBalance = useMemo(() => {
    const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
    const allExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    return allIncome - allExpenses
  }, [transactions])

  const grouped = useMemo(() => groupByDate(monthTransactions), [monthTransactions])

  const dailyTotals = useMemo(() => {
    const totals = {}
    grouped.forEach(([date, txns]) => {
      totals[date] = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    })
    return totals
  }, [grouped])

  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null) // Empty cells for previous month
    }
    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({ date: i, dateStr })
    }
    return days
  }, [selectedDate])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const isCurrentMonth = offset === 0

  const animatedIncome = useCountUp(income, 700)
  const animatedExpenses = useCountUp(expenses, 700)
  const animatedBalance = useCountUp(totalBalance, 800)

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24 relative">
      <div className="max-w-md mx-auto px-4 pt-14">
        {selectedDay && (
          <p className="text-sm text-stone-500 mb-2">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        )}
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

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm animate-scale-in">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-stone-400 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isToday = isCurrentMonth && day && day.dateStr === todayStr
              const isSelected = day && day.dateStr === selectedDay
              const hasTransaction = day && dailyTotals[day.dateStr] > 0

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (day) {
                      setSelectedDay(isSelected ? null : day.dateStr)
                    }
                  }}
                  disabled={!day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-default ${
                    !day
                      ? ''
                      : isSelected
                      ? 'bg-stone-800 text-white shadow-md'
                      : isToday
                      ? 'bg-orange-200 text-stone-800'
                      : hasTransaction
                      ? 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      : 'text-stone-400 hover:bg-stone-50'
                  }`}
                >
                  {day && (
                    <>
                      <span className="text-sm">{day.date}</span>
                      {hasTransaction && (
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-orange-300' : 'text-orange-500'}`}>
                          ${dailyTotals[day.dateStr].toLocaleString()}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="mt-3 w-full py-2 text-sm text-stone-600 bg-stone-100 rounded-lg font-medium hover:bg-stone-200 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm animate-scale-in" style={{ animationDelay: '60ms' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Income</p>
              <p className="text-lg font-bold text-emerald-600">+${Math.round(animatedIncome).toLocaleString()}</p>
            </div>
            <div className="w-px bg-stone-100 self-stretch mx-1" />
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Expenses</p>
              <p className="text-lg font-bold text-red-500">-${Math.round(animatedExpenses).toLocaleString()}</p>
            </div>
            <div className="w-px bg-stone-100 self-stretch mx-1" />
            <div className="flex-1 flex flex-col items-center">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-0.5">Balance</p>
              <p className={`text-lg font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {totalBalance >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(animatedBalance)}
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
          grouped.map(([date, txns], idx) => (
            <div key={date} className="mb-4 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-500 tracking-wide">{formatDateLabel(date)}</span>
                <span className="text-xs text-stone-400">{txns.length} {txns.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {txns.map((t, i) => {
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

                  const cat = CATEGORY_MAP[t.category] || DEFAULT_CAT

                  return (
                    <div key={t.id} className={`relative overflow-hidden ${i < txns.length - 1 ? 'border-b border-stone-100' : ''}`}
                      onTouchStart={(e) => handlers.onTouchStart(t.id, e)}
                      onTouchMove={(e) => handlers.onTouchMove(t.id, e)}
                      onTouchEnd={() => handlers.onTouchEnd(t.id)}
                    >
                      <div onClick={() => onEditTransaction?.(t)} className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-stone-50 transition-transform ${isSwipedOpen ? '-translate-x-16' : ''}`}>
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
                        <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmtMoney(t.amount, t.type === 'income')}
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
