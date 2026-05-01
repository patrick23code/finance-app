import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, deleteDocument, updateDocument } from '../hooks/useFirestore'
import { useSwipeDelete } from '../hooks/useSwipeDelete'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
const CATEGORY_MAP = Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, c]))
const DEFAULT_CAT = { emoji: '📦', color: 'bg-stone-400', label: 'Other' }

const tabs = ['List', 'Spending']
const spendingFilters = ['expenses', 'income', 'all']

const chartPalette = [
  '#8B5CF6',
  '#A7E59A',
  '#6D45E7',
  '#71D7C2',
  '#F5A65B',
  '#EF6F79',
  '#5EA6F8',
  '#B6AACD',
]

const categoryProfiles = {
  rent: { label: 'Rent', emoji: '🏠', color: '#8B5CF6' },
  'credit-card-payments': { label: 'Credit Card Payments', emoji: '💳', color: '#A7E59A' },
  subscriptions: { label: 'Subscriptions', emoji: '🔁', color: '#6D45E7' },
  food: { label: 'Food', emoji: '🍔', color: '#F5A65B' },
  groceries: { label: 'Food', emoji: '🛒', color: '#F5A65B' },
  gas: { label: 'Transportation', emoji: '⛽', color: '#5EA6F8' },
  transport: { label: 'Transportation', emoji: '🚗', color: '#5EA6F8' },
  utilities: { label: 'Utilities', emoji: '💡', color: '#71D7C2' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#EF6F79' },
  salary: { label: 'Salary', emoji: '💰', color: '#22C55E' },
  freelance: { label: 'Freelance', emoji: '💻', color: '#6366F1' },
  other: { label: 'Other', emoji: '📦', color: '#B6AACD' },
}

const tailwindChartColors = {
  'bg-violet-500': '#8B5CF6',
  'bg-indigo-500': '#6366F1',
  'bg-emerald-500': '#10B981',
  'bg-teal-500': '#14B8A6',
  'bg-orange-400': '#FB923C',
  'bg-pink-500': '#EC4899',
  'bg-cyan-500': '#06B6D4',
  'bg-stone-500': '#78716C',
  'bg-green-500': '#22C55E',
  'bg-red-400': '#F87171',
  'bg-blue-500': '#3B82F6',
  'bg-purple-500': '#A855F7',
  'bg-yellow-400': '#FACC15',
  'bg-amber-700': '#B45309',
  'bg-stone-400': '#A8A29E',
  'bg-emerald-600': '#059669',
}

function fmtMoney(n, isIncome) {
  const s = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))
  return isIncome ? `+${s}` : `-${s}`
}

function fmtCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n || 0))
}

function groupByDate(transactions) {
  const groups = {}
  transactions.forEach(t => {
    const fallbackDate = t.createdAt?.toDate ? localDateString(t.createdAt.toDate()) : localDateString()
    const d = t.date || fallbackDate
    if (!groups[d]) groups[d] = []
    groups[d].push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDateLabel(dateStr, upper = false) {
  const d = new Date(dateStr + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return upper ? label.toUpperCase() : label
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeText(value = '') {
  return value.toString().toLowerCase()
}

function inferCategoryId(transaction) {
  const title = normalizeText(`${transaction.name || ''} ${transaction.category || ''} ${transaction.cardName || ''} ${transaction.toName || ''}`)

  if (title.includes('kira') || title.includes('rent')) return 'rent'
  if (
    title.includes('freedom payment') ||
    title.includes('bestbuy payment') ||
    title.includes('capital payment') ||
    title.includes('double cash citi') ||
    title.includes('credit card') ||
    title.includes('card payment') ||
    title.includes('citi') ||
    title.includes('capital one') ||
    title.includes('bestbuy') ||
    title.includes('freedom')
  ) {
    return 'credit-card-payments'
  }
  if (
    title.includes('subscription') ||
    title.includes('spotify') ||
    title.includes('netflix') ||
    title.includes('simplicity') ||
    title.includes('freepik') ||
    title.includes('ui8')
  ) {
    return 'subscriptions'
  }
  if (title.includes('restaurant') || title.includes('dining') || title.includes('food') || title.includes('coffee')) return 'food'
  if (title.includes('gas') || title.includes('uber') || title.includes('lyft') || title.includes('transport')) return 'transport'
  if (title.includes('utility') || title.includes('electric') || title.includes('water') || title.includes('internet')) return 'utilities'
  if (title.includes('shop') || title.includes('amazon') || title.includes('store')) return 'shopping'

  return transaction.category || (transaction.type === 'income' ? 'salary' : 'other')
}

function categoryProfile(id, index) {
  const base = categoryProfiles[id] || CATEGORY_MAP[id] || categoryProfiles.other
  return {
    label: base.label || id,
    emoji: base.emoji || '📦',
    color: base.color && base.color.startsWith('#') ? base.color : chartPalette[index % chartPalette.length],
  }
}

function chartColor(color, index) {
  if (color?.startsWith('#')) return color
  return tailwindChartColors[color] || chartPalette[index % chartPalette.length]
}

function transactionSubtitle(transaction) {
  const cat = transaction.categoryName
    ? { label: transaction.categoryName }
    : categoryProfiles[inferCategoryId(transaction)] || CATEGORY_MAP[transaction.category] || DEFAULT_CAT
  const wallet = transaction.cardName || transaction.toName || (transaction.sourceType === 'account' ? 'Bank account' : 'Main wallet')
  return `${cat.label || transaction.category || 'Other'} · ${wallet}`
}

export default function ActivityPage({ onEditTransaction }) {
  const { user } = useAuth()
  const { data: transactions, loading } = useCollection('transactions', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const { swiped, setSwiped, wasSwipe, handlers } = useSwipeDelete()

  const now = new Date()
  const [offset, setOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedTab, setSelectedTab] = useState('list')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [spendingFilter, setSpendingFilter] = useState('expenses')

  const selectedDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + offset, 1)
  }, [offset])

  const monthStr = useMemo(() =>
    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`,
    [selectedDate]
  )

  const monthLabel = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const monthTransactions = useMemo(() => {
    return transactions.filter(t => (t.date || '').startsWith(monthStr))
  }, [transactions, monthStr])

  const visibleTransactions = useMemo(() => {
    if (!selectedDay) return monthTransactions
    return monthTransactions.filter(t => t.date === selectedDay)
  }, [monthTransactions, selectedDay])

  const income = useMemo(
    () => monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  )
  const expenses = useMemo(
    () => monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  )
  const balance = income - expenses

  const grouped = useMemo(() => groupByDate(visibleTransactions), [visibleTransactions])
  const monthGrouped = useMemo(() => groupByDate(monthTransactions), [monthTransactions])

  const dailyStats = useMemo(() => {
    const totals = {}
    monthGrouped.forEach(([date, txns]) => {
      const dayIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
      const dayExpenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
      totals[date] = { count: txns.length, net: dayIncome - dayExpenses, expenses: dayExpenses }
    })
    return totals
  }, [monthGrouped])

  const categoryTotals = useMemo(() => {
    const filtered = monthTransactions.filter(t => {
      if (spendingFilter === 'all') return true
      return spendingFilter === 'income' ? t.type === 'income' : t.type === 'expense'
    })

    const totals = new Map()
    filtered.forEach(t => {
      const amount = Math.abs(Number(t.amount) || 0)
      if (!amount) return
      const id = t.categoryId || inferCategoryId(t)
      const next = totals.get(id) || {
        id,
        total: 0,
        count: 0,
        label: t.categoryName,
        emoji: t.categoryIcon,
        rawColor: t.categoryColor,
      }
      next.total += amount
      next.count += 1
      next.label ||= t.categoryName
      next.emoji ||= t.categoryIcon
      next.rawColor ||= t.categoryColor
      totals.set(id, next)
    })

    const sorted = Array.from(totals.values()).sort((a, b) => b.total - a.total)
    const grandTotal = sorted.reduce((s, item) => s + item.total, 0)

    return sorted.map((item, index) => {
      const profile = categoryProfile(item.id, index)
      return {
        ...item,
        label: item.label || profile.label,
        emoji: item.emoji || profile.emoji,
        color: chartColor(item.rawColor || profile.color, index),
        percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      }
    })
  }, [monthTransactions, spendingFilter])

  useEffect(() => {
    if (!categoryTotals.length) {
      setSelectedCategory(null)
      return
    }
    if (!categoryTotals.some(item => item.id === selectedCategory)) {
      setSelectedCategory(categoryTotals[0].id)
    }
  }, [categoryTotals, selectedCategory])

  const selectedCategoryData = categoryTotals.find(item => item.id === selectedCategory) || categoryTotals[0]
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= lastDate; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({ date: i, dateStr })
    }
    return days
  }, [selectedDate])

  const todayStr = useMemo(() => localDateString(), [])
  const isCurrentMonth = offset === 0

  const animatedIncome = useCountUp(income, 700)
  const animatedExpenses = useCountUp(expenses, 700)
  const animatedBalance = useCountUp(balance, 800)

  if (loading) return <div className="flex items-center justify-center min-h-svh finance-dashboard-bg"><div className="text-[#8F889B]">Loading...</div></div>

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32 relative">
      <div className="max-w-md mx-auto px-5 pt-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setOffset(o => o - 1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F2EEF8] active:scale-95 transition-transform">
            <ChevronLeft size={18} className="text-[#4B376E]" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#24143F] tracking-tight">{monthLabel}</h1>
            <button
              onClick={() => setShowCalendar(v => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ${showCalendar ? 'bg-[#9E76F4] text-white' : 'bg-[#F2EEF8] text-[#7F7198]'}`}
            >
              <CalendarDays size={16} />
            </button>
          </div>
          <button
            onClick={() => setOffset(o => o + 1)}
            disabled={offset >= 0}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F2EEF8] active:scale-95 transition-transform disabled:opacity-30"
          >
            <ChevronRight size={18} className="text-[#4B376E]" />
          </button>
        </div>

        {showCalendar && (
          <div className="bg-white/90 rounded-2xl p-4 mb-4 shadow-sm animate-scale-in border border-[#E9E3F3]">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-[#8F889B] py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isToday = isCurrentMonth && day && day.dateStr === todayStr
                const isSelected = day && day.dateStr === selectedDay
                const hasTransaction = day && dailyStats[day.dateStr]?.count > 0

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (day) {
                        setSelectedDay(isSelected ? null : day.dateStr)
                        setSelectedTab('list')
                        setShowCalendar(false)
                      }
                    }}
                    disabled={!day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer disabled:cursor-default ${
                      !day ? '' :
                      isSelected ? 'bg-[#9E76F4] text-white shadow-md' :
                      isToday ? 'bg-[#9E76F4]/15 text-[#4B376E]' :
                      hasTransaction ? 'bg-[#F2EEF8] text-[#24143F]' :
                      'text-[#8F889B] hover:bg-[#F4F0FB]'
                    }`}
                  >
                    {day && (
                      <>
                        <span className="text-sm">{day.date}</span>
                        {hasTransaction && (
                          <span className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-100' : 'text-[#9E76F4]'}`}>
                            {dailyStats[day.dateStr].count}
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
                onClick={() => { setSelectedDay(null); setShowCalendar(false) }}
                className="mt-3 w-full py-2 text-sm text-[#9E76F4] rounded-lg font-semibold transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {selectedDay && (
          <p className="text-sm text-[#7F7198] mb-2 flex items-center gap-1">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            <button onClick={() => setSelectedDay(null)} className="ml-1 text-xs text-[#9E76F4] font-semibold">x Clear</button>
          </p>
        )}

        <SegmentedTabs selectedTab={selectedTab} onChange={setSelectedTab} />

        <div key={selectedTab} className="animate-fade-in-up">
          {selectedTab === 'spending' && (
            <SpendingTab
              filter={spendingFilter}
              onFilterChange={setSpendingFilter}
              categories={categoryTotals}
              selectedCategory={selectedCategoryData}
              onSelectCategory={setSelectedCategory}
            />
          )}

          {selectedTab === 'list' && (
            <>
              <SummaryCard
                income={animatedIncome}
                expenses={animatedExpenses}
                balance={animatedBalance}
                balanceRaw={balance}
              />
              <TransactionList
                grouped={grouped}
                dailyStats={dailyStats}
                debts={debts}
                accounts={accounts}
                swiped={swiped}
                setSwiped={setSwiped}
                wasSwipe={wasSwipe}
                handlers={handlers}
                onEditTransaction={onEditTransaction}
              />
            </>
          )}
        </div>
      </div>

      {createPortal(
        <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto px-5 flex justify-end">
            <button
              onClick={() => onNavigate('add-transaction')}
              className="w-14 h-14 bg-[#180B3D] text-white rounded-2xl flex items-center justify-center active:scale-95 transition-transform pointer-events-auto shadow-[0_12px_28px_-6px_rgba(99,102,241,0.5)]"
            >
              <Plus size={26} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function SegmentedTabs({ selectedTab, onChange }) {
  return (
    <div className="bg-white/65 backdrop-blur-xl rounded-full p-1 mb-4 border border-white/70 shadow-[0_12px_28px_rgba(49,28,96,0.08)]">
      <div className="grid grid-cols-2 gap-1">
        {tabs.map(tab => {
          const id = tab.toLowerCase()
          const active = selectedTab === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`h-10 rounded-full text-sm font-bold transition-all duration-300 active:scale-[0.98] ${
                active
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#B095F6] text-white shadow-[0_10px_24px_rgba(139,92,246,0.28)]'
                  : 'text-[#5F5275] hover:bg-white/60'
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({ income, expenses, balance, balanceRaw }) {
  return (
    <div className="bg-white/90 rounded-2xl p-4 mb-4 shadow-[0_16px_36px_rgba(49,28,96,0.08)] animate-scale-in border border-[#E9E3F3]" style={{ animationDelay: '60ms' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-0.5">Income</p>
          <p className="text-lg font-bold text-emerald-400">+${Math.round(income).toLocaleString()}</p>
        </div>
        <div className="w-px bg-[#E9E3F3] self-stretch mx-1" />
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-0.5">Expenses</p>
          <p className="text-lg font-bold text-red-400">-${Math.round(expenses).toLocaleString()}</p>
        </div>
        <div className="w-px bg-[#E9E3F3] self-stretch mx-1" />
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[10px] font-bold text-[#7F7198] uppercase tracking-wide mb-0.5">Balance</p>
          <p className={`text-lg font-bold ${balanceRaw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {balanceRaw >= 0 ? '+' : '-'}{fmtCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  )
}

function SpendingTab({ filter, onFilterChange, categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white/92 border border-[#E9E3F3] p-4 shadow-[0_16px_36px_rgba(49,28,96,0.08)]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-bold text-[#24143F]">Monthly spending</h2>
          <div className="flex rounded-full bg-[#F4F0FB] p-1">
            {spendingFilters.map(item => (
              <button
                key={item}
                onClick={() => onFilterChange(item)}
                className={`px-3 h-8 rounded-full text-[11px] font-bold capitalize transition-all ${
                  filter === item ? 'bg-white text-[#8B5CF6] shadow-sm' : 'text-[#7F7198]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {categories.length ? (
          <>
            <div className="flex justify-center py-2">
              <SpendingDonut segments={categories} selectedCategory={selectedCategory} onSelect={onSelectCategory} />
            </div>
            <div className="mt-5 space-y-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 transition-all active:scale-[0.99] ${
                    selectedCategory?.id === category.id ? 'bg-[#F4F0FB]' : 'bg-white hover:bg-[#FAF8FE]'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                  <span className="w-10 h-10 rounded-xl bg-[#F2EEF8] flex items-center justify-center text-lg flex-shrink-0">
                    {category.emoji}
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-bold text-[#24143F] truncate">{category.label}</span>
                    <span className="block text-xs font-medium text-[#8F889B]">{category.percentage.toFixed(0)}% of total</span>
                  </span>
                  <span className="text-sm font-black text-[#24143F]">{fmtCurrency(category.total)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <EmptyTransactions compact message="No matching transactions this month" />
        )}
      </div>
    </div>
  )
}

function SpendingDonut({ segments, selectedCategory, onSelect }) {
  const size = 210
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((s, item) => s + item.total, 0)
  let cumulative = 0

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3EFF9"
          strokeWidth={strokeWidth}
        />
        {segments.map(segment => {
          const pct = total > 0 ? segment.total / total : 0
          const length = circumference * pct
          const offset = -circumference * cumulative
          cumulative += pct
          return (
            <circle
              key={segment.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={selectedCategory?.id === segment.id ? strokeWidth + 2 : strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={offset}
              onClick={() => onSelect(segment.id)}
              className="cursor-pointer transition-all duration-300"
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10">
        <div className="w-11 h-11 rounded-2xl bg-[#F4F0FB] flex items-center justify-center text-xl mb-2">
          {selectedCategory?.emoji || '📦'}
        </div>
        <p className="text-xl font-black text-[#180B3D] tracking-tight">{fmtCurrency(selectedCategory?.total || 0)}</p>
        <p className="text-xs font-bold text-[#7F7198] truncate max-w-[120px]">{selectedCategory?.label || 'No category'}</p>
      </div>
    </div>
  )
}

function TransactionList({
  grouped,
  dailyStats,
  debts,
  accounts,
  swiped,
  setSwiped,
  wasSwipe,
  handlers,
  onEditTransaction,
}) {
  if (!grouped.length) return <EmptyTransactions />

  return (
    <div className="space-y-4">
      {grouped.map(([date, txns], idx) => {
        const net = dailyStats[date]?.net || 0
        return (
          <div key={date} className="animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-[#4B376E] tracking-tight">{formatDateLabel(date)}</span>
              <span className={`text-xs font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {txns.length} {txns.length === 1 ? 'entry' : 'entries'} · {net >= 0 ? '+' : '-'}{fmtCurrency(net)}
              </span>
            </div>
            <div className="space-y-2">
              {txns.map((transaction, index) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isLast={index === txns.length - 1}
                  debts={debts}
                  accounts={accounts}
                  swiped={swiped}
                  setSwiped={setSwiped}
                  wasSwipe={wasSwipe}
                  handlers={handlers}
                  onEditTransaction={onEditTransaction}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TransactionRow({
  transaction,
  debts,
  accounts,
  swiped,
  setSwiped,
  wasSwipe,
  handlers,
  onEditTransaction,
}) {
  const isSwipedOpen = swiped === transaction.id
  const cat = transaction.categoryIcon || transaction.categoryName || transaction.categoryColor
    ? {
        emoji: transaction.categoryIcon || '📦',
        color: transaction.categoryColor || 'bg-stone-400',
        label: transaction.categoryName || 'Other',
      }
    : CATEGORY_MAP[transaction.category] || categoryProfiles[inferCategoryId(transaction)] || DEFAULT_CAT
  const catClass = cat.color?.startsWith('bg-') ? cat.color : ''
  const catStyle = catClass ? undefined : { backgroundColor: cat.color || '#F4F0FB' }

  async function handleDelete() {
    try {
      if (transaction.sourceId && transaction.sourceType) {
        if (transaction.sourceType === 'card') {
          const card = debts.find(d => d.id === transaction.sourceId)
          if (card) {
            const reverseAmount = transaction.type === 'expense'
              ? (card.remaining || 0) - transaction.amount
              : (card.remaining || 0) + transaction.amount
            await updateDocument('debts', transaction.sourceId, { remaining: reverseAmount })
          }
        } else if (transaction.sourceType === 'account') {
          const account = accounts.find(a => a.id === transaction.sourceId)
          if (account) {
            const reverseBalance = transaction.type === 'expense'
              ? (account.balance || 0) + transaction.amount
              : Math.max(0, (account.balance || 0) - transaction.amount)
            await updateDocument('accounts', transaction.sourceId, { balance: reverseBalance })
          }
        }
      }
      await deleteDocument('transactions', transaction.id)
      setSwiped(null)
    } catch (e) {
      console.warn('Delete failed:', e)
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/92 border border-[#E9E3F3] shadow-[0_12px_28px_rgba(49,28,96,0.07)]"
      onTouchStart={(e) => handlers.onTouchStart(transaction.id, e)}
      onTouchMove={(e) => handlers.onTouchMove(transaction.id, e)}
      onTouchEnd={() => handlers.onTouchEnd(transaction.id)}
    >
      <div
        onClick={() => {
          if (wasSwipe()) return
          if (isSwipedOpen) { setSwiped(null); return }
          onEditTransaction?.(transaction)
        }}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-[#F4F0FB] transition-transform ${isSwipedOpen ? '-translate-x-16' : ''}`}
      >
        <div
          className={`w-10 h-10 rounded-xl ${catClass || ''} flex items-center justify-center text-lg flex-shrink-0`}
          style={catStyle}
        >
          {cat.emoji || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#24143F] text-sm truncate">{transaction.name}</p>
          <p className="text-xs text-[#7F7198] truncate">{transactionSubtitle(transaction)}</p>
        </div>
        <p className={`font-bold text-sm ${transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtMoney(transaction.amount, transaction.type === 'income')}
        </p>
      </div>
      {isSwipedOpen && (
        <button onClick={handleDelete} className="absolute right-0 top-0 h-full bg-red-500 text-white px-4 flex items-center justify-center font-semibold">
          <Trash2 size={18} />
        </button>
      )}
    </div>
  )
}

function EmptyTransactions({ compact = false, message = 'No transactions yet' }) {
  return (
    <div className={`text-center ${compact ? 'py-7' : 'py-12'} text-[#8F889B]`}>
      <p className="font-semibold">{message}</p>
      <p className="text-sm mt-1">Tap the plus button to log a transaction</p>
    </div>
  )
}
