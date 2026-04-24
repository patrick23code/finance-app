import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'

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
  const { data: transactions, loading: tLoading } = useCollection('transactions', user?.uid)

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + (d.remaining || 0), 0), [debts])

  const thisMonth = useMemo(() => {
    const now = new Date()
    const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions.filter(t => (t.date || '').startsWith(ms))
  }, [transactions])

  const paidOut = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
  const interestEst = useMemo(() => {
    return debts.reduce((s, d) => {
      if (!d.apr || !d.remaining) return s
      return s + (d.remaining * (d.apr / 100) / 12)
    }, 0)
  }, [debts])

  const savedYTD = useMemo(() => {
    const now = new Date()
    const yearStr = `${now.getFullYear()}`
    return transactions
      .filter(t => (t.date || '').startsWith(yearStr) && t.type === 'income')
      .reduce((s, t) => s + (t.amount || 0), 0)
  }, [transactions])

  const debtFreeDate = useMemo(() => {
    if (!debts.length) return null
    const latestEndDate = debts
      .filter(d => d.endDate)
      .map(d => d.endDate)
      .sort()
      .reverse()[0]
    return latestEndDate || null
  }, [debts])

  const chartData = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        value: totalDebt,
      })
    }
    return months
  }, [totalDebt])

  const breakdown = useMemo(() => {
    const groups = {}
    debts.forEach(d => {
      if (!groups[d.type]) groups[d.type] = { label: d.type === 'loan' ? 'Loans' : d.type === 'credit_card' ? 'Credit cards' : 'Personal', total: 0, color: DEBT_COLORS[d.type] }
      groups[d.type].total += d.remaining || 0
    })
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [debts])

  if (dLoading || tLoading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">
        <p className="text-stone-500 text-sm mb-1">Last 12 months</p>
        <h1 className="text-3xl font-bold text-stone-800 tracking-tight mb-6">Progress</h1>

        {/* Trend Chart */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Total debt trend</p>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight mb-4">-{fmtFull(totalDebt)}</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#44403c" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#44403c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={v => [fmtFull(v), 'Total debt']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="value" stroke="#44403c" strokeWidth={2} fill="url(#debtGrad)" dot={false} activeDot={{ r: 4, fill: '#44403c' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="This month" value={fmtFull(paidOut)} sub="paid out" />
          <StatCard label="Interest" value={fmtFull(interestEst)} sub="this month (est.)" />
          <StatCard label="Debt-free" value={debtFreeDate || 'N/A'} sub="at current pace" />
          <StatCard label="Saved" value={fmt(savedYTD)} sub="YTD income" />
        </div>

        {/* Breakdown */}
        {breakdown.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-4">Breakdown</p>
            <div className="flex flex-col gap-4">
              {breakdown.map(b => {
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

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-stone-800 tracking-tight">{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  )
}
