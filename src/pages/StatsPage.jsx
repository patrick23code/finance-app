import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'
import MonkeyLogo from '../components/MonkeyLogo'

const CAT_COLOR_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.color]))
const CAT_EMOJI_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.emoji]))

const DEBT_COLORS = {
  loan: '#44403c',
  credit_card: '#fb923c',
  personal: '#fda4af',
}

const BG_GRADIENT = 'linear-gradient(135deg, #3b0764 0%, #6d28d9 50%, #4c1d95 100%)'

const glassCard = (borderRgba, accentHex) => ({
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  border: `1px solid ${borderRgba}`,
  borderLeft: `4px solid ${accentHex}`,
})

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

  if (dLoading || tLoading || aLoading) return <div className="flex items-center justify-center min-h-svh" style={{ background: BG_GRADIENT }}><div className="text-purple-200">Loading...</div></div>

  return (
    <div className="min-h-svh pb-24 relative overflow-hidden" style={{ background: BG_GRADIENT }}>
      {/* Decorative stats symbols background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <span className="absolute text-6xl opacity-5 top-6 left-4">📊</span>
        <span className="absolute text-5xl opacity-5 top-12 right-8">📈</span>
        <span className="absolute text-7xl opacity-5 top-28 left-1/2 -translate-x-1/2">💰</span>
        <span className="absolute text-5xl opacity-5 top-48 right-4">%</span>
        <span className="absolute text-6xl opacity-5 top-56 left-6">$</span>
        <span className="absolute text-5xl opacity-5 top-80 right-12">📉</span>
        <span className="absolute text-6xl opacity-5 top-96 left-1/3">💹</span>
        <span className="absolute text-5xl opacity-5" style={{ top: '480px', right: '24px' }}>🏦</span>
        <span className="absolute text-7xl opacity-5" style={{ top: '560px', left: '12px' }}>📊</span>
        <span className="absolute text-5xl opacity-5" style={{ top: '640px', right: '40px' }}>📈</span>
        <span className="absolute text-6xl opacity-5" style={{ top: '720px', left: '50%' }}>💎</span>
        <span className="absolute text-5xl opacity-5" style={{ top: '800px', left: '20px' }}>%</span>
        <span className="absolute text-6xl opacity-5" style={{ top: '880px', right: '16px' }}>$</span>
        <span className="absolute text-5xl opacity-5" style={{ top: '960px', left: '30%' }}>💹</span>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 relative z-10">
        {/* Logo Header */}
        <div className="flex items-center justify-center mb-6">
          <MonkeyLogo size={42} className="text-emerald-400" />
        </div>

        <p className="text-purple-300 text-sm mb-1">Financial overview</p>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-6">Stats</h1>

        {/* Net Worth Card */}
        <div className="rounded-2xl p-5 mb-4 shadow-lg animate-scale-in" style={glassCard('rgba(255,255,255,0.15)', '#22d3ee')}>
          <p className="text-purple-300 text-xs font-medium uppercase tracking-wide mb-3">Net worth</p>
          <p className={`text-4xl font-bold tracking-tight mb-4 ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netWorth >= 0 ? '+' : ''}{fmtFull(animatedNetWorth)}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-purple-300 text-xs mb-1">Assets</p>
              <p className="font-semibold text-white">{fmtFull(animatedAssets)}</p>
            </div>
            <div>
              <p className="text-purple-300 text-xs mb-1">Debts</p>
              <p className="font-semibold text-white">-{fmtFull(animatedDebt)}</p>
            </div>
          </div>
        </div>

        {/* Income vs Expense */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(52,211,153,0.3)', '#34d399'), animationDelay: '40ms' }}>
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide mb-2">Income</p>
            <p className="text-2xl font-bold text-emerald-300 mb-2">{fmtFull(animatedIncome)}</p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full bg-emerald-400" style={{ width: '100%' }} />
            </div>
          </div>
          <div className="rounded-2xl p-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(248,113,113,0.3)', '#f87171'), animationDelay: '80ms' }}>
            <p className="text-[10px] font-bold text-red-300 uppercase tracking-wide mb-2">Expense</p>
            <p className="text-2xl font-bold text-red-300 mb-2">{fmtFull(animatedMonthly)}</p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full bg-red-400" style={{ width: thisMonthIncome > 0 ? `${Math.min(100, (thisMonthExpenses / thisMonthIncome) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>

        {/* Savings & Velocity */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(34,211,238,0.3)', '#22d3ee'), animationDelay: '120ms' }}>
            <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-wide mb-2">Savings Rate</p>
            <p className={`text-2xl font-bold mb-2 ${savingsRate >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {savingsRate >= 0 ? '+' : ''}{savingsRate}%
            </p>
            <p className="text-xs text-purple-200 font-medium">{fmtFull(thisMonthIncome - thisMonthExpenses)}</p>
          </div>
          <div className="rounded-2xl p-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(251,191,36,0.3)', '#fbbf24'), animationDelay: '160ms' }}>
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wide mb-2">Daily Average</p>
            <p className="text-2xl font-bold text-white mb-2">{fmtFull(animatedDaily)}</p>
            <p className="text-xs text-purple-200 font-medium">{daysLeftInMonth} days left</p>
          </div>
        </div>

        {/* Monthly Spending Trend */}
        <div className="rounded-2xl p-5 mb-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(244,114,182,0.3)', '#f472b6'), animationDelay: '200ms' }}>
          <p className="text-[10px] font-semibold text-pink-300 uppercase tracking-wide mb-3">Monthly spending trend</p>
          <p className="text-2xl font-bold text-white tracking-tight mb-4">{fmtFull(animatedMonthly)}</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={monthlyTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#c4b5fd' }} axisLine={false} tickLine={false} />
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
          <div className="rounded-2xl p-5 mb-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(167,139,250,0.3)', '#a78bfa'), animationDelay: '240ms' }}>
            <p className="text-[10px] font-semibold text-purple-300 uppercase tracking-wide mb-3">Spending by category</p>
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
          <div className="rounded-2xl p-5 mb-4 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(96,165,250,0.3)', '#60a5fa'), animationDelay: '280ms' }}>
            <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-wide mb-3">Top transactions this month</p>
            <div className="flex flex-col gap-2">
              {topTransactions.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <span className="text-sm text-purple-100">{t.name}</span>
                  <span className="font-semibold text-white">{fmtFull(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debt Breakdown */}
        {debtBreakdown.length > 0 && (
          <div className="rounded-2xl p-5 shadow-lg animate-scale-in" style={{ ...glassCard('rgba(251,191,36,0.3)', '#fbbf24'), animationDelay: '320ms' }}>
            <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide mb-4">Debt breakdown</p>
            <div className="flex flex-col gap-4">
              {debtBreakdown.map(b => {
                const pct = totalDebt ? Math.round((b.total / totalDebt) * 100) : 0
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-purple-100">{b.label}</span>
                      <span className="text-sm text-purple-300">{fmtFull(b.total)} · {pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
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
          <span className="text-sm font-medium text-purple-100 capitalize">{label}</span>
        </div>
        <span className="text-sm text-purple-300">{value} <span className="text-purple-400">({pct}%)</span></span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
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
