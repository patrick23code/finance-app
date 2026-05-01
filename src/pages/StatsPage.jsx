import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'

const tabItems = ['Overview', 'Spending', 'Debt', 'Wealth']
const rangeOptions = [
  { id: '1m', label: 'This Month', months: 1 },
  { id: '3m', label: '3 Months', months: 3 },
  { id: '6m', label: '6 Months', months: 6 },
  { id: '12m', label: '1 Year', months: 12 },
]

const TW_COLORS = {
  'bg-stone-500': '#78716c',
  'bg-red-400': '#f87171',
  'bg-green-500': '#22c55e',
  'bg-orange-400': '#fb923c',
  'bg-amber-700': '#b45309',
  'bg-blue-400': '#60a5fa',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-yellow-400': '#facc15',
  'bg-cyan-500': '#06b6d4',
  'bg-teal-600': '#0d9488',
  'bg-emerald-500': '#10b981',
  'bg-emerald-600': '#059669',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-stone-400': '#a8a29e',
}

const CATEGORY_MAP = Object.fromEntries([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(c => [c.id, c]))
const chartPalette = ['#8B5CF6', '#A7E59A', '#6D45E7', '#71D7C2', '#F5A65B', '#EF6F79', '#5EA6F8', '#B6AACD']
const debtColors = { credit_card: '#8B5CF6', loan: '#71D7C2', personal: '#F5A65B' }

function money(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}

function pct(value) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseDate(dateStr) {
  return dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
}

function categoryMeta(transaction, index = 0) {
  const id = transaction.categoryId || transaction.category || 'other'
  const meta = CATEGORY_MAP[id] || {}
  const color = transaction.categoryColor || meta.color
  return {
    id,
    label: transaction.categoryName || meta.label || id,
    emoji: transaction.categoryIcon || meta.emoji || '📦',
    color: color?.startsWith('#') ? color : TW_COLORS[color] || chartPalette[index % chartPalette.length],
  }
}

function accountType(account = {}) {
  if (account.kind) return account.kind
  if (account.type === 'savings') return 'Savings'
  if (account.type === 'cash') return 'Cash'
  if (account.type === 'digital_wallet') return 'Digital Wallets'
  if (account.type === 'business') return 'Business'
  if (account.type === 'checking') return 'Checking'
  return 'Other'
}

function debtLabel(type) {
  if (type === 'credit_card') return 'Credit Cards'
  if (type === 'loan') return 'Loans'
  return 'Personal Debts'
}

function buildMonthlySeries(transactions, months) {
  const now = new Date()
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1)
    const key = monthKey(date)
    const monthTx = transactions.filter(t => (t.date || '').startsWith(key))
    const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    return {
      key,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      income,
      expenses,
      cashFlow: income - expenses,
    }
  })
}

function estimateHealthScore({ cashFlow, savingsRate, avgUtilization, debtToAssetRatio, totalAssets }) {
  let score = 50
  if (cashFlow > 0) score += 18
  else if (cashFlow < 0) score -= 12
  score += Math.max(-10, Math.min(18, savingsRate * 55))
  score += avgUtilization <= 30 ? 16 : avgUtilization <= 70 ? 4 : -14
  score += debtToAssetRatio <= 0.35 ? 12 : debtToAssetRatio <= 0.8 ? 2 : -12
  if (totalAssets > 1000) score += 6
  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function StatsPage() {
  const { user } = useAuth()
  const { data: transactions, loading: tLoading } = useCollection('transactions', user?.uid)
  const { data: debts, loading: dLoading } = useCollection('debts', user?.uid)
  const { data: accounts, loading: aLoading } = useCollection('accounts', user?.uid)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [rangeId, setRangeId] = useState('6m')

  const range = rangeOptions.find(option => option.id === rangeId) || rangeOptions[2]

  const analytics = useMemo(() => {
    const now = new Date()
    const currentMonthKey = monthKey(now)
    const previousMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const start = new Date(now.getFullYear(), now.getMonth() - range.months + 1, 1)
    const filteredTransactions = transactions.filter(t => parseDate(t.date) >= start)
    const thisMonth = transactions.filter(t => (t.date || '').startsWith(currentMonthKey))
    const previousMonth = transactions.filter(t => (t.date || '').startsWith(previousMonthKey))

    const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const monthlyCashFlow = totalIncome - totalExpenses
    const totalAssets = accounts.reduce((sum, account) => sum + (Number(account.balance) || 0), 0)
    const totalDebts = debts.reduce((sum, debt) => sum + (Number(debt.remaining) || 0), 0)
    const netWorth = totalAssets - totalDebts
    const debtToAssetRatio = totalAssets > 0 ? totalDebts / totalAssets : totalDebts > 0 ? 1 : 0
    const savingsRate = totalIncome > 0 ? monthlyCashFlow / totalIncome : 0
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1)
    const averageDailySpend = dayOfMonth > 0 ? totalExpenses / dayOfMonth : 0
    const safeDailySpending = Math.max(0, monthlyCashFlow / remainingDays)

    const monthlySeries = buildMonthlySeries(transactions, range.months)

    const categoryMap = new Map()
    thisMonth.filter(t => t.type === 'expense').forEach((transaction, index) => {
      const meta = categoryMeta(transaction, index)
      const existing = categoryMap.get(meta.id) || { ...meta, total: 0, count: 0 }
      existing.total += Number(transaction.amount) || 0
      existing.count += 1
      categoryMap.set(meta.id, existing)
    })
    const spendingByCategory = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
    const categoryPercentages = spendingByCategory.map(item => ({
      ...item,
      percentage: totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0,
      previousTotal: previousMonth
        .filter(t => t.type === 'expense' && (t.categoryId || t.category || 'other') === item.id)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    }))
    const highestSpendingCategory = categoryPercentages[0]

    const debtGroups = debts.reduce((groups, debt) => {
      const type = debt.type || 'personal'
      groups[type] = (groups[type] || 0) + (Number(debt.remaining) || 0)
      return groups
    }, {})
    const debtBreakdown = ['credit_card', 'loan', 'personal']
      .map(type => ({ id: type, label: debtLabel(type), total: debtGroups[type] || 0, color: debtColors[type] }))
      .filter(item => item.total > 0)

    const creditCards = debts.filter(debt => debt.type === 'credit_card')
    const totalCreditCardDebt = debtGroups.credit_card || 0
    const totalLoanDebt = debtGroups.loan || 0
    const totalPersonalDebt = debtGroups.personal || 0
    const creditCardUtilization = creditCards.map(card => {
      const balance = Number(card.remaining) || 0
      const limit = Number(card.creditLimit) || 0
      return {
        ...card,
        utilization: limit > 0 ? (balance / limit) * 100 : 0,
        available: Math.max(0, limit - balance),
      }
    }).sort((a, b) => b.utilization - a.utilization)
    const avgUtilization = creditCardUtilization.length
      ? creditCardUtilization.reduce((sum, card) => sum + card.utilization, 0) / creditCardUtilization.length
      : 0
    const monthlyDebtPayments = debts.reduce((sum, debt) => sum + (Number(debt.monthly) || 0), 0)

    const accountGroups = accounts.reduce((groups, account) => {
      const type = accountType(account)
      if (!groups[type]) groups[type] = []
      groups[type].push(account)
      return groups
    }, {})
    const assetBreakdown = Object.entries(accountGroups)
      .map(([type, items], index) => ({
        label: type,
        total: items.reduce((sum, account) => sum + (Number(account.balance) || 0), 0),
        color: chartPalette[index % chartPalette.length],
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total)

    const healthScore = estimateHealthScore({ cashFlow: monthlyCashFlow, savingsRate, avgUtilization, debtToAssetRatio, totalAssets })

    const foodThisMonth = categoryPercentages.find(item => /food|grocer|coffee/i.test(item.label))
    const insights = [
      foodThisMonth && foodThisMonth.previousTotal > 0
        ? `You spent ${pct(((foodThisMonth.total - foodThisMonth.previousTotal) / foodThisMonth.previousTotal) * 100)} ${foodThisMonth.total >= foodThisMonth.previousTotal ? 'more' : 'less'} on ${foodThisMonth.label} than last month.`
        : highestSpendingCategory
          ? `${highestSpendingCategory.label} is your highest spending category this month.`
          : 'Add transactions to unlock spending insights.',
      totalDebts > 0
        ? `Your total debt is ${money(totalDebts)} across ${debts.length} item${debts.length !== 1 ? 's' : ''}.`
        : 'No active debts are tracked right now.',
      `You have ${money(safeDailySpending)}/day safe spending left this month.`,
      creditCardUtilization.find(card => card.utilization >= 80)
        ? `${creditCardUtilization.find(card => card.utilization >= 80).name} is above 80% utilization.`
        : avgUtilization > 0
          ? `Average credit card utilization is ${pct(avgUtilization)}.`
          : 'Add credit limits to track card utilization.',
    ].filter(Boolean)

    return {
      filteredTransactions,
      thisMonth,
      previousMonth,
      totalIncome,
      totalExpenses,
      monthlyCashFlow,
      totalAssets,
      totalDebts,
      netWorth,
      debtToAssetRatio,
      savingsRate,
      averageDailySpend,
      safeDailySpending,
      monthlySeries,
      spendingByCategory,
      categoryPercentages,
      highestSpendingCategory,
      debtBreakdown,
      totalCreditCardDebt,
      totalLoanDebt,
      totalPersonalDebt,
      creditCardUtilization,
      avgUtilization,
      monthlyDebtPayments,
      accountGroups,
      assetBreakdown,
      healthScore,
      insights,
    }
  }, [accounts, debts, range.months, transactions])

  if (tLoading || dLoading || aLoading) {
    return (
      <div className="flex items-center justify-center min-h-svh finance-dashboard-bg">
        <div className="text-[#8F889B]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32">
      <div className="max-w-md mx-auto px-5 pt-8 relative z-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[32px] font-black italic text-[#170A34] tracking-tight leading-none">Analytics</h1>
            <p className="mt-1 text-xs font-bold text-[#7F7198]">Financial dashboard</p>
          </div>
          <div className="relative">
            <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7F7198] pointer-events-none" />
            <select
              value={rangeId}
              onChange={event => setRangeId(event.target.value)}
              className="appearance-none h-10 rounded-full bg-white/90 border border-[#E9E3F3] pl-9 pr-8 text-xs font-black text-[#24143F] shadow-[0_10px_24px_rgba(49,28,96,0.08)] outline-none"
            >
              {rangeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F7198] pointer-events-none" />
          </div>
        </div>

        <div className="mb-5 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full rounded-full bg-white/70 p-1 border border-white/80 shadow-[0_12px_28px_rgba(49,28,96,0.08)]">
            {tabItems.map(tab => {
              const id = tab.toLowerCase()
              const active = selectedTab === id
              return (
                <button
                  key={id}
                  onClick={() => setSelectedTab(id)}
                  className={`h-10 px-4 rounded-full text-sm font-black whitespace-nowrap transition-all active:scale-[0.98] ${
                    active ? 'bg-[#F2EEF8] text-[#24143F] shadow-sm' : 'text-[#7F7198]'
                  }`}
                >
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        <div key={selectedTab} className="animate-fade-in-up">
          {selectedTab === 'overview' && <OverviewTab data={analytics} />}
          {selectedTab === 'spending' && <SpendingTab data={analytics} />}
          {selectedTab === 'debt' && <DebtTab data={analytics} debts={debts} />}
          {selectedTab === 'wealth' && <WealthTab data={analytics} accounts={accounts} />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ data }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] bg-white/92 border border-[#E9E3F3] p-5 shadow-[0_18px_42px_rgba(49,28,96,0.09)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-[#8F889B]">Financial Health Score</p>
            <p className="text-[44px] font-black text-[#170A34] leading-none mt-1">{data.healthScore}</p>
          </div>
          <ScoreRing value={data.healthScore} />
        </div>
        <p className="text-xs font-semibold text-[#7F7198] leading-relaxed">
          Based on cash flow, savings rate, credit utilization, debt ratio, and available cash.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Net Worth" value={money(data.netWorth)} tone={data.netWorth >= 0 ? 'good' : 'bad'} />
        <MetricCard label="Cash Flow" value={money(data.monthlyCashFlow)} tone={data.monthlyCashFlow >= 0 ? 'good' : 'bad'} />
        <MetricCard label="Total Debt" value={money(data.totalDebts)} />
        <MetricCard label="Safe / Day" value={money(data.safeDailySpending)} />
      </div>

      <Card title="Income vs Expenses">
        <MonthlyBarChart data={data.monthlySeries} />
      </Card>

      <Card title="Net Worth Trend">
        <LineChart data={data.monthlySeries.map((item, index) => ({
          label: item.label,
          value: data.netWorth - data.monthlySeries.slice(index + 1).reduce((sum, next) => sum + next.cashFlow, 0),
        }))} />
      </Card>

      <SmartInsights insights={data.insights} />
    </div>
  )
}

function SpendingTab({ data }) {
  const needs = data.categoryPercentages
    .filter(item => /rent|utilities|transport|grocer|food/i.test(item.label))
    .reduce((sum, item) => sum + item.total, 0)
  const wants = Math.max(0, data.totalExpenses - needs)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Spent" value={money(data.totalExpenses)} tone="bad" />
        <MetricCard label="Avg Daily" value={money(data.averageDailySpend)} />
      </div>

      <Card title="Spending by Category">
        {data.categoryPercentages.length ? (
          <div className="flex items-center gap-4">
            <Donut segments={data.categoryPercentages.map(item => ({ value: item.total, color: item.color }))} size={132} center={money(data.totalExpenses)} />
            <div className="flex-1 min-w-0 space-y-2">
              {data.categoryPercentages.slice(0, 5).map(item => (
                <LegendRow key={item.id} color={item.color} label={item.label} value={`${money(item.total)} · ${pct(item.percentage)}`} />
              ))}
            </div>
          </div>
        ) : <EmptyState text="Add expenses to see category analytics." />}
      </Card>

      <Card title="Category Trend">
        <MiniTrendBars data={data.categoryPercentages.slice(0, 6).map(item => ({
          label: item.label,
          value: item.total,
          color: item.color,
        }))} />
      </Card>

      <Card title="Top Spending Categories">
        <div className="space-y-3">
          {data.categoryPercentages.slice(0, 6).map(item => (
            <ProgressRow
              key={item.id}
              icon={item.emoji}
              label={item.label}
              value={money(item.total)}
              percent={item.percentage}
              color={item.color}
              detail={item.previousTotal ? `${item.total >= item.previousTotal ? '+' : ''}${pct(((item.total - item.previousTotal) / item.previousTotal) * 100)} vs last month` : `${item.count} transaction${item.count !== 1 ? 's' : ''}`}
            />
          ))}
          {!data.categoryPercentages.length && <EmptyState text="No spending categories this month." />}
        </div>
      </Card>

      <Card title="Needs vs Wants">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Needs" value={money(needs)} />
          <MetricCard label="Wants" value={money(wants)} />
        </div>
      </Card>
    </div>
  )
}

function DebtTab({ data, debts }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Total Debt" value={money(data.totalDebts)} />
        <MetricCard label="Monthly Payments" value={money(data.monthlyDebtPayments)} />
        <MetricCard label="Credit Cards" value={money(data.totalCreditCardDebt)} />
        <MetricCard label="Loans + Personal" value={money(data.totalLoanDebt + data.totalPersonalDebt)} />
      </div>

      <Card title="Debt Breakdown">
        {data.debtBreakdown.length ? (
          <div className="flex items-center gap-4">
            <Donut segments={data.debtBreakdown.map(item => ({ value: item.total, color: item.color }))} size={132} center={money(data.totalDebts)} />
            <div className="flex-1 min-w-0 space-y-2">
              {data.debtBreakdown.map(item => (
                <LegendRow key={item.id} color={item.color} label={item.label} value={money(item.total)} />
              ))}
            </div>
          </div>
        ) : <EmptyState text="No debts tracked yet." />}
      </Card>

      <Card title="Debt Trend">
        <LineChart data={data.monthlySeries.map((item, index) => ({
          label: item.label,
          value: Math.max(0, data.totalDebts + (data.monthlySeries.length - index - 1) * data.monthlyDebtPayments),
        }))} />
      </Card>

      <Card title="Credit Card Utilization">
        <div className="space-y-3">
          {data.creditCardUtilization.map(card => (
            <ProgressRow
              key={card.id}
              icon={<CreditCard size={16} />}
              label={card.name}
              value={pct(card.utilization)}
              percent={card.utilization}
              color={card.utilization >= 80 ? '#EF4444' : card.utilization >= 70 ? '#F59E0B' : '#8B5CF6'}
              detail={`${money(card.remaining || 0)} used${card.creditLimit ? ` of ${money(card.creditLimit)}` : ''}`}
              warning={card.utilization >= 70}
            />
          ))}
          {!data.creditCardUtilization.length && <EmptyState text="Add credit cards with limits to track utilization." />}
        </div>
      </Card>

      <Card title="Upcoming Payments">
        <div className="space-y-2">
          {debts.filter(debt => debt.dueDay || debt.monthly).slice(0, 5).map(debt => (
            <div key={debt.id} className="flex items-center justify-between rounded-2xl bg-[#F8F5FC] px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#24143F] truncate">{debt.name}</p>
                <p className="text-xs font-semibold text-[#8F889B]">{debt.dueDay ? `Due day ${debt.dueDay}` : 'Monthly payment'}</p>
              </div>
              <p className="text-sm font-black text-[#24143F]">{money(debt.monthly || 0)}</p>
            </div>
          ))}
          {!debts.some(debt => debt.dueDay || debt.monthly) && <EmptyState text="No payment schedules available." />}
        </div>
      </Card>
    </div>
  )
}

function WealthTab({ data, accounts }) {
  const groupOrder = ['Checking', 'Savings', 'Cash', 'Digital Wallets', 'Business', 'Other']

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] bg-gradient-to-br from-[#12D18E] via-[#0BAA6F] to-[#04784F] p-5 shadow-[0_22px_44px_rgba(6,120,79,0.24)] overflow-hidden">
        <p className="text-white/80 text-[11px] font-black uppercase tracking-[0.2em] mb-2">Total Assets</p>
        <p className="text-[42px] font-black text-white leading-none">{money(data.totalAssets)}</p>
        <p className="mt-3 text-sm font-bold text-white/80">Net worth: {money(data.netWorth)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Assets" value={money(data.totalAssets)} tone="good" />
        <MetricCard label="Debts" value={money(data.totalDebts)} />
        <MetricCard label="Net Worth" value={money(data.netWorth)} tone={data.netWorth >= 0 ? 'good' : 'bad'} />
        <MetricCard label="Debt / Assets" value={pct(data.debtToAssetRatio * 100)} />
      </div>

      <Card title="Asset Breakdown">
        {data.assetBreakdown.length ? (
          <div className="flex items-center gap-4">
            <Donut segments={data.assetBreakdown.map(item => ({ value: item.total, color: item.color }))} size={132} center={money(data.totalAssets)} />
            <div className="flex-1 min-w-0 space-y-2">
              {data.assetBreakdown.map(item => (
                <LegendRow key={item.label} color={item.color} label={item.label} value={money(item.total)} />
              ))}
            </div>
          </div>
        ) : <EmptyState text="Add accounts to see asset analytics." />}
      </Card>

      <Card title="Wealth Trend">
        <LineChart data={data.monthlySeries.map((item, index) => ({
          label: item.label,
          value: data.totalAssets - data.monthlySeries.slice(index + 1).reduce((sum, next) => sum + next.cashFlow, 0),
        }))} />
      </Card>

      {groupOrder.map(group => {
        const items = data.accountGroups[group] || []
        if (!items.length) return null
        return (
          <Card key={group} title={group}>
            <div className="space-y-2">
              {items.map(account => (
                <div key={account.id} className="flex items-center justify-between rounded-2xl bg-[#F8F5FC] px-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-[#F2EEF8] flex items-center justify-center text-lg">
                      {account.type === 'cash' ? '💵' : account.type === 'savings' ? '💰' : account.type === 'digital_wallet' ? 'P' : '🏦'}
                    </span>
                    <p className="text-sm font-black text-[#24143F] truncate">{account.name}</p>
                  </div>
                  <p className="text-sm font-black text-[#24143F]">{money(account.balance || 0)}</p>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      {!accounts.length && <Card title="Accounts"><EmptyState text="No wealth accounts have been added yet." /></Card>}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-[24px] bg-white/92 border border-[#E9E3F3] p-4 shadow-[0_16px_36px_rgba(49,28,96,0.08)]">
      <h2 className="text-[15px] font-black text-[#24143F] mb-4">{title}</h2>
      {children}
    </div>
  )
}

function MetricCard({ label, value, tone }) {
  const toneClass = tone === 'good' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-400' : 'text-[#24143F]'
  return (
    <div className="rounded-[20px] bg-white/92 border border-[#E9E3F3] p-4 shadow-[0_12px_28px_rgba(49,28,96,0.07)] min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#8F889B] mb-1">{label}</p>
      <p className={`text-[20px] font-black tracking-tight truncate ${toneClass}`}>{value}</p>
    </div>
  )
}

function SmartInsights({ insights }) {
  return (
    <Card title="Smart Insights">
      <div className="space-y-2">
        {insights.map((insight, index) => (
          <div key={index} className="flex gap-3 rounded-2xl bg-[#F8F5FC] p-3">
            <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
              <Lightbulb size={16} className="text-[#9E76F4]" />
            </span>
            <p className="text-sm font-semibold text-[#4B376E] leading-snug">{insight}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function EmptyState({ text }) {
  return <p className="py-6 text-center text-sm font-semibold text-[#8F889B]">{text}</p>
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold text-[#4B376E] truncate">{label}</span>
      </div>
      <span className="text-xs font-black text-[#24143F] whitespace-nowrap">{value}</span>
    </div>
  )
}

function ProgressRow({ icon, label, value, detail, percent, color, warning }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#F2EEF8] flex items-center justify-center text-sm shrink-0 text-[#7F55E9]">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#24143F] truncate">{label}</p>
            {detail && <p className="text-[11px] font-semibold text-[#8F889B] truncate">{detail}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {warning && <AlertTriangle size={14} className="text-amber-500" />}
          <span className="text-sm font-black text-[#24143F]">{value}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[#E9E3F3] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function MonthlyBarChart({ data }) {
  const max = Math.max(1, ...data.flatMap(item => [item.income, item.expenses]))
  return (
    <div className="h-[210px] grid grid-cols-[34px_1fr] gap-3">
      <div className="flex flex-col justify-between pb-7 text-[10px] font-bold text-[#8F889B]">
        {[max, max / 2, 0].map((value, index) => <span key={index}>{money(value)}</span>)}
      </div>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
          {[0, 1, 2].map(item => <span key={item} className="h-px bg-[#EEE8F6]" />)}
        </div>
        <div className="relative h-full grid gap-2" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map(item => (
            <div key={item.key} className="flex flex-col items-center justify-end gap-2">
              <div className="h-[165px] flex items-end gap-1.5">
                <span className="w-3.5 rounded-full bg-[#8B5CF6]" style={{ height: `${Math.max(8, (item.income / max) * 155)}px` }} />
                <span className="w-3.5 rounded-full bg-[#A7E59A]" style={{ height: `${Math.max(8, (item.expenses / max) * 155)}px` }} />
              </div>
              <span className="text-[10px] font-bold text-[#8F889B]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniTrendBars({ data }) {
  const max = Math.max(1, ...data.map(item => item.value))
  if (!data.length) return <EmptyState text="No trend data yet." />
  return (
    <div className="h-[170px] grid items-end gap-3" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
      {data.map(item => (
        <div key={item.label} className="flex flex-col items-center justify-end gap-2 min-w-0">
          <span className="w-8 rounded-full" style={{ height: `${Math.max(18, (item.value / max) * 130)}px`, backgroundColor: item.color }} />
          <span className="text-[10px] font-bold text-[#7F7198] truncate max-w-full">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data }) {
  const width = 320
  const height = 150
  const values = data.map(item => item.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width
    const y = height - ((item.value - min) / range) * (height - 18) - 9
    return { x, y, label: item.label }
  })
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[150px] overflow-visible">
        {[0, 1, 2].map(line => (
          <line key={line} x1="0" x2={width} y1={(height / 2) * line} y2={(height / 2) * line} stroke="#EEE8F6" strokeWidth="1" />
        ))}
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(point => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" fill="#8B5CF6" stroke="white" strokeWidth="2" />)}
      </svg>
      <div className="grid text-[10px] font-bold text-[#8F889B]" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map(item => <span key={item.label} className="text-center">{item.label}</span>)}
      </div>
    </div>
  )
}

function Donut({ segments, size = 130, stroke = 18, center }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, item) => sum + item.value, 0)
  let cumulative = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F2EEF8" strokeWidth={stroke} />
        {segments.map((segment, index) => {
          const portion = total > 0 ? segment.value / total : 0
          const length = circumference * portion
          const offset = -circumference * cumulative
          cumulative += portion
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={offset}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
        <p className="text-[15px] font-black text-[#24143F] leading-tight">{center}</p>
      </div>
    </div>
  )
}

function ScoreRing({ value }) {
  const size = 88
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (value / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F2EEF8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <ShieldCheck size={26} className="absolute inset-0 m-auto text-[#8B5CF6]" />
    </div>
  )
}
