import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'

const CAT_COLOR_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.color]))
const CAT_EMOJI_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.emoji]))

const DEBT_COLORS = {
  loan: '#44403c',
  credit_card: '#fb923c',
  personal: '#fda4af',
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toLocaleString()}`
}

function fmtFull(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function StatsPage() {
  const { user } = useAuth()
  const { data: debts, loading: dLoading } = useCollection('debts', user?.uid)
  const { data: accounts, loading: aLoading } = useCollection('accounts', user?.uid)
  const { data: transactions, loading: tLoading } = useCollection('transactions', user?.uid)

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + (d.remaining || 0), 0), [debts])
  const totalAssets = useMemo(() => accounts.reduce((s, a) => s + (a.balance || 0), 0), [accounts])
  const netWorth = totalAssets - totalDebt

  const thisMonth = useMemo(() => {
    const now = new Date()
    const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions.filter(t => (t.date || '').startsWith(ms))
  }, [transactions])

  const thisMonthExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)

  const categoryBreakdown = useMemo(() => {
    const groups = {}
    thisMonth
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'other'
        if (!groups[cat]) groups[cat] = 0
        groups[cat] += t.amount || 0
      })
    return Object.entries(groups)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total)
  }, [thisMonth])

  const topTransactions = useMemo(() => {
    return thisMonth
      .filter(t => t.type === 'expense')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5)
  }, [thisMonth])

  const monthlyTrend = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = d.toISOString().slice(0, 7)
      const monthExpenses = transactions
        .filter(t => (t.date || '').startsWith(monthStr) && t.type === 'expense')
        .reduce((s, t) => s + (t.amount || 0), 0)
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        value: monthExpenses,
      })
    }
    return months
  }, [transactions])

  const debtBreakdown = useMemo(() => {
    const groups = {}
    debts.forEach(d => {
      if (!groups[d.type]) groups[d.type] = { label: d.type === 'loan' ? 'Loans' : d.type === 'credit_card' ? 'Credit cards' : 'Personal', total: 0, color: DEBT_COLORS[d.type] }
      groups[d.type].total += d.remaining || 0
    })
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [debts])

  const thisMonthIncome = useMemo(() => thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0), [thisMonth])

  const savingsRate = thisMonthIncome > 0 ? Math.round(((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100) : 0

  const daysInMonth = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }
  const daysLeftInMonth = daysInMonth() - new Date().getDate()
  const dailyAverage = thisMonthExpenses > 0 ? thisMonthExpenses / new Date().getDate() : 0

  const animatedNetWorth = useCountUp(netWorth, 1000)
  const animatedAssets = useCountUp(totalAssets, 900)
  const animatedDebt = useCountUp(totalDebt, 900)
  const animatedMonthly = useCountUp(thisMonthExpenses, 800)
  const animatedIncome = useCountUp(thisMonthIncome, 800)
  const animatedDaily = useCountUp(dailyAverage, 800)

  if (dLoading || tLoading || aLoading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">
        <p className="text-stone-500 text-sm mb-1">Financial overview</p>
        <h1 className="text-3xl font-bold text-stone-800 tracking-tight mb-6">Stats</h1>

        {/* Net Worth Card */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-4 mb-4 shadow-sm animate-scale-in border border-stone-700/50">
          <p className="text-stone-400 text-xs font-medium uppercase tracking-wide mb-3">Net worth</p>
          <p className={`text-4xl font-bold tracking-tight mb-4 ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netWorth >= 0 ? '+' : ''}{fmtFull(animatedNetWorth)}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-stone-400 text-xs mb-1">Assets</p>
              <p className="font-semibold text-white">{fmtFull(animatedAssets)}</p>
            </div>
            <div>
              <p className="text-stone-400 text-xs mb-1">Debts</p>
              <p className="font-semibold text-white">-{fmtFull(animatedDebt)}</p>
            </div>
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '40ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Income</p>
            <p className="text-2xl font-bold text-emerald-600 mb-2">{fmtFull(animatedIncome)}</p>
            <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl p-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '80ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Expense</p>
            <p className="text-2xl font-bold text-red-500 mb-2">{fmtFull(animatedMonthly)}</p>
            <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400" style={{ width: thisMonthIncome > 0 ? `${Math.min(100, (thisMonthExpenses / thisMonthIncome) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>

        {/* Savings & Velocity */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '120ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Savings Rate</p>
            <p className={`text-2xl font-bold mb-2 ${savingsRate >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {savingsRate >= 0 ? '+' : ''}{savingsRate}%
            </p>
            <p className="text-xs text-stone-500">{fmtFull(thisMonthIncome - thisMonthExpenses)}</p>
          </div>
          <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl p-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '160ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-2">Daily Average</p>
            <p className="text-2xl font-bold text-stone-800 mb-2">{fmtFull(animatedDaily)}</p>
            <p className="text-xs text-stone-500">{daysLeftInMonth} days left</p>
          </div>
        </div>

        {/* Monthly Spending Trend */}
        <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl p-4 mb-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '200ms' }}>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Monthly spending trend</p>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mb-4">{fmtFull(animatedMonthly)}</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={monthlyTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={v => [fmtFull(v), 'Spending']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="value" stroke="#f87171" strokeWidth={2} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-4 mb-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '240ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Spending by category</p>
            <div className="flex flex-col gap-2">
              {categoryBreakdown.map((item, idx) => {
                const pct = thisMonthExpenses ? Math.round((item.total / thisMonthExpenses) * 100) : 0
                const emoji = CAT_EMOJI_MAP[item.category] || '📦'
                // Convert bg-* class to inline color for the bar
                const bgClass = CAT_COLOR_MAP[item.category] || 'bg-stone-400'
                const barColors = {
                  'bg-stone-500': '#78716c', 'bg-red-400': '#f87171', 'bg-green-500': '#22c55e',
                  'bg-orange-400': '#fb923c', 'bg-amber-700': '#b45309', 'bg-blue-500': '#3b82f6',
                  'bg-purple-500': '#a855f7', 'bg-pink-500': '#ec4899', 'bg-yellow-400': '#facc15',
                  'bg-cyan-500': '#06b6d4', 'bg-teal-600': '#0d9488', 'bg-emerald-600': '#059669',
                  'bg-indigo-500': '#6366f1', 'bg-stone-400': '#a8a29e',
                }
                const barColor = barColors[bgClass] || '#a8a29e'
                return (
                  <AnimatedBar
                    key={item.category}
                    pct={pct}
                    barColor={barColor}
                    emoji={emoji}
                    label={item.category}
                    value={fmtFull(item.total)}
                    delay={idx * 80}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Top Transactions */}
        {topTransactions.length > 0 && (
          <div className="bg-gradient-to-br from-white to-cyan-50 rounded-2xl p-4 mb-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '280ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Top transactions this month</p>
            <div className="flex flex-col gap-2">
              {topTransactions.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-700">{t.name}</span>
                  <span className="font-semibold text-stone-800">{fmtFull(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debt Breakdown */}
        {debtBreakdown.length > 0 && (
          <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl p-4 shadow-sm animate-scale-in border border-stone-100/50" style={{ animationDelay: '320ms' }}>
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-4">Debt breakdown</p>
            <div className="flex flex-col gap-4">
              {debtBreakdown.map(b => {
                const pct = totalDebt ? Math.round((b.total / totalDebt) * 100) : 0
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-stone-700">{b.label}</span>
                      <span className="text-sm text-stone-500">{fmtFull(b.total)} · {pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-100 rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AnimatedBar({ pct, barColor, emoji, label, value, delay = 0 }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100 + delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="text-sm font-medium text-stone-700 capitalize">{label}</span>
        </div>
        <span className="text-sm text-stone-500">{value} <span className="text-stone-400">({pct}%)</span></span>
      </div>
      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: barColor,
            transition: 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
    </div>
  )
}
