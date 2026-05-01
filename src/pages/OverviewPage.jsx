import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, TrendingDown, Plus, Grid3X3, Repeat, Download, X, CreditCard, Landmark, Users, CalendarDays } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, addDocument, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'
import { useCategories } from '../hooks/useCategories'
import DonutChart from '../components/DonutChart'

const DEBT_COLORS = {
  loan: '#0F172A',
  credit_card: '#F59E0B',
  personal: '#10B981',
}

const DEBT_CARD_STYLES = {
  credit_card: { iconBg: 'bg-amber-500/20', iconColor: 'text-amber-400', accent: '#F59E0B' },
  loan: { iconBg: 'bg-slate-500/20', iconColor: 'text-[#7F7198]', accent: '#6366F1' },
  personal: { iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400', accent: '#10B981' },
}

const DEBT_ICONS = {
  loan: Landmark,
  credit_card: CreditCard,
  personal: Users,
}

const DEBT_LABELS = {
  loan: 'Loans',
  credit_card: 'Cards',
  personal: 'Personal',
}

const DEBT_TABS = [
  { id: 'credit_card', label: 'Credit Cards', emptyTitle: 'No credit cards yet', addLabel: 'Add credit card' },
  { id: 'loan', label: 'Loans', emptyTitle: 'No loans yet', addLabel: 'Add loan' },
  { id: 'personal', label: 'Personal', emptyTitle: 'No personal debts yet', addLabel: 'Add personal debt' },
]

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtShort(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function OverviewPage({ onNavigate, onDebtClick, onAddDebtType }) {
  const { user } = useAuth()
  const { data: debts, loading } = useCollection('debts', user?.uid)
  const { data: debtSnapshots } = useCollection('debtSnapshots', user?.uid)
  const [selectedDebtTab, setSelectedDebtTab] = useState(null)

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`

  const totals = useMemo(() => {
    const byType = { loan: 0, credit_card: 0, personal: 0 }
    let total = 0
    debts.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + (d.remaining || 0)
      total += d.remaining || 0
    })
    return { byType, total }
  }, [debts])

  const byType = useMemo(() => {
    const groups = {}
    debts.forEach(d => {
      if (!groups[d.type]) groups[d.type] = []
      groups[d.type].push(d)
    })
    // Sort credit cards by available credit (highest first)
    if (groups.credit_card) {
      groups.credit_card.sort((a, b) => {
        const availA = (a.creditLimit || 0) - (a.remaining || 0)
        const availB = (b.creditLimit || 0) - (b.remaining || 0)
        return availB - availA
      })
    }
    // Order: credit_card → loan → personal
    const order = ['credit_card', 'loan', 'personal']
    const sorted = {}
    order.forEach(type => {
      if (groups[type]) sorted[type] = groups[type]
    })
    return sorted
  }, [debts])

  const preferredDebtTab = byType.credit_card?.length
    ? 'credit_card'
    : byType.loan?.length
      ? 'loan'
      : byType.personal?.length
        ? 'personal'
        : 'credit_card'
  const activeDebtTab = selectedDebtTab || preferredDebtTab
  const activeDebtItems = byType[activeDebtTab] || []
  const activeDebtTotal = activeDebtItems.reduce((s, d) => s + (d.remaining || 0), 0)
  const activeDebtMeta = DEBT_TABS.find(t => t.id === activeDebtTab) || DEBT_TABS[0]
  const debtChange = useMemo(() => {
    const previous = debtSnapshots.find(snapshot => snapshot.month === prevMonthKey || snapshot.monthKey === prevMonthKey)
    const current = debtSnapshots.find(snapshot => snapshot.month === monthKey || snapshot.monthKey === monthKey)
    const previousTotal = previous ? Number(previous.totalDebt ?? previous.total ?? previous.amount) : null
    const currentTotal = current ? Number(current.totalDebt ?? current.total ?? current.amount) : totals.total
    if (!previous || !Number.isFinite(previousTotal)) return null
    return currentTotal - previousTotal
  }, [debtSnapshots, monthKey, prevMonthKey, totals.total])
  const upcomingPayments = useMemo(() => buildUpcomingPayments(debts, today), [debts, today])

  const animatedTotal = useCountUp(totals.total)

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-[#A98DE9]"><div className="text-white/80">Loading...</div></div>

  const donutSegments = Object.entries(totals.byType)
    .filter(([, val]) => val > 0)
    .map(([type, val]) => ({ name: DEBT_LABELS[type], value: val, color: DEBT_COLORS[type] }))

  return (
    <div className="finance-dashboard-bg min-h-svh pb-32">
      <div className="max-w-md mx-auto px-5 pt-6 relative z-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-[34px] font-black text-[#170A34] tracking-tight leading-none">Debts</h1>
            <div className="flex items-center gap-1.5 text-[#8F889B] mt-2">
              <CalendarDays size={14} strokeWidth={2.2} />
              <span className="text-[12px] font-semibold">{dateLabel}</span>
            </div>
          </div>
          <button
            onClick={() => onAddDebtType?.(preferredDebtTab)}
            className="px-4 h-11 rounded-full bg-white/88 text-[#180B3D] text-[13px] font-black shadow-[0_12px_28px_rgba(49,28,96,0.12)] border border-white/70 active:scale-95 transition-transform flex-shrink-0"
          >
            + Add
          </button>
        </div>

        {/* Hero Total Debts Card */}
        <div className="bg-white/82 backdrop-blur rounded-[28px] p-5 mb-6 animate-scale-in shadow-[0_18px_42px_rgba(49,28,96,0.08)]" style={{ animationDelay: '80ms' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[#7F7198] text-[11px] font-semibold tracking-wide uppercase mb-1">Total debt</p>
              <p className="text-[36px] font-black text-[#170A34] tracking-tight leading-none mb-2">{fmt(animatedTotal)}</p>
              <DebtChangeLine change={debtChange} />
              <p className="text-xs text-[#7F7198] font-medium">Across {debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
            </div>
            {donutSegments.length > 0 && (
              <DonutChart
                segments={donutSegments}
                size={86}
                strokeWidth={10}
              />
            )}
          </div>

          {totals.total > 0 && (
            <div className="mt-5 pt-4 border-t border-[#E5DFF1] grid grid-cols-3 gap-3">
              {Object.entries(totals.byType).map(([type, val]) => {
                const pct = totals.total ? Math.round((val / totals.total) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DEBT_COLORS[type] }} />
                      <p className="text-[10px] font-semibold text-[#7F7198] uppercase tracking-wide">{DEBT_LABELS[type]}</p>
                    </div>
                    <p className="text-sm font-bold text-[#24143F]">{fmtShort(val)}</p>
                    <p className="text-[10px] text-[#8F889B] font-medium">{pct}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <UpcomingPayments
          payments={upcomingPayments}
          onViewAll={() => onNavigate?.('recurring')}
        />

        <DebtTabControl
          active={activeDebtTab}
          counts={{
            credit_card: byType.credit_card?.length || 0,
            loan: byType.loan?.length || 0,
            personal: byType.personal?.length || 0,
          }}
          onChange={setSelectedDebtTab}
        />

        <div className="mb-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-black text-[#24143F] tracking-tight">
              {activeDebtMeta.label} <span className="text-[#8F889B] font-medium ml-0.5">{activeDebtItems.length}</span>
            </span>
            <span className="text-xs text-[#7F7198] font-semibold">{fmt(activeDebtTotal)}</span>
          </div>

          {activeDebtItems.length === 0 ? (
            <DebtEmptyState
              title={activeDebtMeta.emptyTitle}
              addLabel={activeDebtMeta.addLabel}
              onAdd={() => onAddDebtType?.(activeDebtTab)}
            />
          ) : activeDebtTab === 'personal' ? (
            <div className="bg-white/86 rounded-[24px] overflow-hidden shadow-[0_16px_36px_rgba(49,28,96,0.08)]">
              {activeDebtItems.map((d, i) => (
                <PersonalDebtRow key={d.id} debt={d} last={i === activeDebtItems.length - 1} onClick={() => onDebtClick(d)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeDebtItems.map(d => (
                <DebtCard key={d.id} debt={d} onClick={() => onDebtClick(d)} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function DebtTabControl({ active, counts, onChange }) {
  return (
    <div className="bg-white/72 backdrop-blur rounded-[22px] p-1.5 mb-5 shadow-[0_12px_30px_rgba(49,28,96,0.08)] border border-white/70">
      <div className="grid grid-cols-3 gap-1">
        {DEBT_TABS.map(tab => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`h-11 rounded-[17px] text-[12px] font-black transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-gradient-to-br from-[#9E76F4] to-[#6F45DE] text-white shadow-[0_10px_20px_rgba(111,69,222,0.24)]'
                  : 'text-[#6D5E84]'
              }`}
            >
              <span className="block leading-tight">{tab.label}</span>
              <span className={`block text-[10px] leading-tight mt-0.5 ${isActive ? 'text-white/78' : 'text-[#9B90AA]'}`}>
                {counts[tab.id] || 0}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DebtChangeLine({ change }) {
  if (change === null || change === undefined) {
    return <p className="text-[12px] font-bold text-[#8F889B] mb-2">No trend yet</p>
  }
  if (change === 0) {
    return <p className="text-[12px] font-bold text-[#8F889B] mb-2">No change this month</p>
  }

  const isDown = change < 0
  return (
    <p className={`text-[12px] font-black mb-2 ${isDown ? 'text-emerald-600' : 'text-amber-600'}`}>
      {isDown ? 'Down' : 'Up'} {fmt(Math.abs(change))} this month
    </p>
  )
}

function UpcomingPayments({ payments, onViewAll }) {
  return (
    <section className="mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-[16px] font-black text-[#24143F] tracking-tight">Upcoming Payments</h2>
        <button onClick={onViewAll} className="text-[12px] font-black text-[#9E76F4] active:scale-95 transition-transform">
          View all
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
        {payments.length > 0 ? payments.map(payment => (
          <button
            key={payment.id}
            className="snap-start min-w-[238px] max-w-[238px] h-[78px] rounded-[22px] bg-white/88 border border-white/70 pl-0 pr-3.5 py-3 text-left shadow-[0_10px_24px_rgba(49,28,96,0.08)] active:scale-[0.98] transition-transform flex items-center gap-3 overflow-hidden"
          >
            <span className="w-1 self-stretch rounded-l-[22px] flex-shrink-0" style={{ backgroundColor: payment.daysUntil === 0 ? '#EF4444' : payment.daysUntil <= 3 ? '#F59E0B' : payment.accent }} />
            <span className={`w-10 h-10 rounded-full ${payment.iconBg} flex items-center justify-center flex-shrink-0`}>
              <payment.Icon size={18} className={payment.iconColor} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-black text-[#24143F] truncate">{payment.name}</span>
              <span className={`block text-[11px] font-black mt-1 truncate ${payment.daysUntil === 0 ? 'text-red-500' : payment.daysUntil <= 3 ? 'text-amber-600' : 'text-[#8F889B]'}`}>
                {payment.dateLabel} · {payment.daysUntil === 0 ? 'due today' : `due in ${payment.daysUntil}d`}
              </span>
            </span>
            <span className={`text-[13px] font-black flex-shrink-0 text-right ${payment.daysUntil === 0 ? 'text-red-500' : payment.daysUntil <= 3 ? 'text-amber-600' : 'text-[#170A34]'}`}>
              {fmtShort(payment.amount)}
            </span>
          </button>
        )) : (
          <div className="snap-start min-w-[260px] h-[82px] rounded-[22px] bg-white/88 border border-white/70 px-3.5 py-3 shadow-[0_10px_24px_rgba(49,28,96,0.08)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F2EEF8] text-[#9E76F4] flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-[#24143F]">No upcoming payments</p>
              <p className="text-[11px] font-semibold text-[#8F889B] mt-0.5">Add due dates to see reminders.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function DebtEmptyState({ title, addLabel, onAdd }) {
  return (
    <div className="bg-white/86 rounded-[24px] p-8 text-center shadow-[0_16px_36px_rgba(49,28,96,0.08)] border border-white/70">
      <TrendingDown size={36} className="text-[#9E76F4] mx-auto mb-3" />
      <p className="text-[#24143F] font-black">{title}</p>
      <p className="text-[#7F7198] text-sm mt-1 font-medium">Keep this category organized from the full debt form.</p>
      <button
        onClick={onAdd}
        className="mt-4 bg-[#180B3D] text-white px-5 py-3 rounded-2xl text-sm font-black active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 20px -4px rgba(24, 11, 61, 0.35)' }}
      >
        {addLabel}
      </button>
    </div>
  )
}

function buildUpcomingPayments(debts, today) {
  return debts
    .map(debt => {
      const dueDay = Number(debt.dueDay)
      const amount = Number(debt.monthly ?? debt.minPayment ?? debt.minimumPayment ?? debt.minMonthlyPayment)
      if (!dueDay || !amount) return null

      const thisMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      let dueDate = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, thisMonthLastDay))
      if (dueDate < startOfDay(today)) {
        const nextMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, nextMonthLastDay))
      }

      const daysUntil = Math.max(0, Math.ceil((startOfDay(dueDate) - startOfDay(today)) / 86400000))
      const styles = DEBT_CARD_STYLES[debt.type] || DEBT_CARD_STYLES.loan
      return {
        id: debt.id,
        name: debt.name || debt.person || 'Debt payment',
        amount,
        dueDate,
        daysUntil,
        dateLabel: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        typeLabel: debt.type === 'credit_card' ? 'Credit Card' : debt.type === 'personal' ? 'Personal Debt' : 'Loan',
        Icon: DEBT_ICONS[debt.type] || Landmark,
        iconBg: styles.iconBg,
        iconColor: styles.iconColor,
        accent: styles.accent,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 5)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function PersonalDebtRow({ debt, last, onClick }) {
  const isOwesYou = debt.direction === 'they_owe'
  const since = debt.since ? new Date(debt.since + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : null

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5 active:bg-[#F4F0FB] transition-colors cursor-pointer" onClick={onClick}>
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-emerald-600" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#24143F] text-[15px]">{debt.person || debt.name}</p>
          <p className="text-xs text-[#8F889B] truncate font-medium">
            {debt.for && `${debt.for}`}{since && ` · since ${since}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-[15px] tracking-tight ${isOwesYou ? 'text-emerald-600' : 'text-[#24143F]'}`}>
            {isOwesYou ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(debt.remaining)}
          </p>
          <p className={`text-[10px] font-bold tracking-wide ${isOwesYou ? 'text-emerald-600' : 'text-[#8F889B]'}`}>
            {isOwesYou ? 'OWES YOU' : 'YOU OWE'}
          </p>
        </div>
      </div>
      {!last && <div className="h-px bg-[#E9E3F3] mx-4" />}
    </>
  )
}

function DebtCard({ debt, onClick }) {
  const isCC = debt.type === 'credit_card'
  const pct = isCC
    ? (debt.creditLimit ? Math.min(100, (debt.remaining / debt.creditLimit) * 100) : 0)
    : (debt.originalAmount ? Math.min(100, ((debt.originalAmount - debt.remaining) / debt.originalAmount) * 100) : 0)

  const available = isCC && debt.creditLimit ? debt.creditLimit - debt.remaining : null
  const [barPct, setBarPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarPct(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const styles = DEBT_CARD_STYLES[debt.type] || DEBT_CARD_STYLES.loan
  const Icon = DEBT_ICONS[debt.type] || Landmark

  return (
    <div
      className="bg-white/86 rounded-[24px] p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-[0_16px_36px_rgba(49,28,96,0.08)]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-full ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={styles.iconColor} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          {debt.bank && <p className="text-[10px] font-bold text-[#8F889B] uppercase tracking-wide mb-0.5">{debt.bank}</p>}
          <p className="font-black text-[#24143F] text-[15px] tracking-tight">
            {debt.name}
            {debt.last4 && <span className="text-[#8F889B] font-medium"> ·{debt.last4}</span>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-[#24143F] text-lg tracking-tight">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(debt.remaining)}</p>
          {isCC && debt.creditLimit && (
            <p className="text-[10px] text-[#8F889B] font-medium">of {debt.creditLimit >= 1000 ? `$${(debt.creditLimit/1000).toFixed(0)}k` : `$${debt.creditLimit}`}</p>
          )}
          {!isCC && <p className="text-[10px] text-[#8F889B] font-medium">remaining</p>}
        </div>
      </div>

      {/* Sleek thin progress bar */}
      <div className="w-full h-1.5 bg-[#E9E3F3] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barPct}%`,
            backgroundColor: isCC
              ? (pct >= 85 ? '#EF4444' : pct >= 65 ? '#F59E0B' : '#10B981')
              : (pct >= 80 ? '#10B981' : pct >= 50 ? '#6366F1' : '#6366F1'),
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-[#7F7198] font-medium mt-2">
        <span>
          {isCC && available !== null
            ? `${Math.round(pct)}% used · $${available.toLocaleString()} available`
            : `${debt.monthly ? `$${debt.monthly.toLocaleString()}/mo` : ''}${debt.apr ? ` · ${debt.apr}% APR` : ''}`
          }
        </span>
        <span>
          {isCC && debt.monthly && debt.dueDay
            ? `min $${debt.monthly} · ${new Date(new Date().getFullYear(), new Date().getMonth(), debt.dueDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : debt.endDate ? `ends ${debt.endDate}` : ''
          }
        </span>
      </div>
    </div>
  )
}

function SettingsSheet({ isOpen, onClose, onNavigate, user, recurring, accounts, debts }) {
  const [activeModal, setActiveModal] = useState(null)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [editRecurring, setEditRecurring] = useState(null)
  const [theme, setTheme] = useState('light')

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#180B3D]/28 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-24">
          <div className="flex justify-between items-center mb-4">
            <div className="w-10 h-1 bg-[#D8CEE8] rounded-full" />
            <button onClick={onClose} className="p-1 hover:bg-[#E9E3F3] rounded-full transition-colors">
              <X size={20} className="text-[#7F7198]" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="bg-white/90 rounded-3xl p-5 mb-6 border border-[#E9E3F3]">
            <div className="flex items-center gap-4">
              <img
                src={user?.photoURL}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
                onError={e => e.target.style.display = 'none'}
              />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-[#24143F] truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-sm text-[#7F7198] truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Settings Sections */}

          {/* Quick Actions */}
          <SettingsSection title="Quick Actions">
            <SettingItem
              icon={<Plus size={20} />}
              iconBg="bg-[#9E76F4]/20"
              label="Add New Debt"
              description="Add a credit card, loan, or personal debt"
              onClick={() => { onClose(); onNavigate?.('add') }}
            />
          </SettingsSection>

          {/* Account Management */}
          <SettingsSection title="Account Management">
            <SettingItem
              icon={<Grid3X3 size={20} />}
              iconBg="bg-sky-500/20"
              label="Category Manager"
              description="Manage expense & income categories"
              onClick={() => setActiveModal('categories')}
            />
          </SettingsSection>

          {/* Payments & Planning */}
          <SettingsSection title="Payments & Planning">
            <SettingItem
              icon={<Repeat size={20} />}
              iconBg="bg-purple-500/20"
              label="Recurring"
              description="Set up recurring expenses"
              onClick={() => setActiveModal('recurring')}
            />
          </SettingsSection>

          {/* Data & Preferences */}
          <SettingsSection title="Data & Preferences">
            <SettingItem
              icon={<Download size={20} />}
              iconBg="bg-amber-500/20"
              label="Export Data"
              description="Export as JSON or CSV"
              onClick={() => setActiveModal('export')}
            />
          </SettingsSection>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'recurring' && (
        <div className="fixed inset-0 z-50">
          <RecurringSettingsTab
            recurring={recurring}
            payFromOptions={payFromOptions}
            userId={user.uid}
            onEdit={(item) => {
              setEditRecurring(item)
              setShowRecurringForm(true)
            }}
            onClose={() => setActiveModal(null)}
          />
        </div>
      )}

      {activeModal === 'categories' && (
        <div className="fixed inset-0 z-50">
          <CategoriesTab onClose={() => setActiveModal(null)} />
        </div>
      )}

      {activeModal === 'theme' && (
        <div className="fixed inset-0 z-50">
          <ThemeModal theme={theme} setTheme={setTheme} onClose={() => setActiveModal(null)} />
        </div>
      )}

      {activeModal === 'export' && (
        <div className="fixed inset-0 z-50">
          <ExportModal onClose={() => setActiveModal(null)} />
        </div>
      )}

      {activeModal === 'accounts' && (
        <div className="fixed inset-0 z-50">
          <AccountsModal accounts={accounts} onClose={() => setActiveModal(null)} />
        </div>
      )}

      {showRecurringForm && (
        <RecurringFormModal
          item={editRecurring}
          payFromOptions={payFromOptions}
          userId={user.uid}
          onClose={() => {
            setShowRecurringForm(false)
            setEditRecurring(null)
          }}
        />
      )}
    </>,
    document.body
  )
}

function SettingsSection({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-[#8F889B] uppercase tracking-wide mb-3 px-1">{title}</p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function SettingItem({ icon, iconBg, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white/90 rounded-2xl p-4 flex items-center gap-3 border border-[#E9E3F3] active:bg-[#F4F0FB] transition-colors"
    >
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center text-[#4B376E] flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-[#24143F] text-sm">{label}</p>
        <p className="text-xs text-[#7F7198] truncate">{description}</p>
      </div>
      <ChevronRight size={18} className="text-[#8F889B] flex-shrink-0" />
    </button>
  )
}

function ThemeModal({ theme, setTheme, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Theme</h2>
            <div className="w-12" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setTheme('light'); onClose(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-[#180B3D] text-white'
                  : 'bg-white/90 text-[#7F7198] border border-[#E9E3F3]'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => { setTheme('dark'); onClose(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-[#180B3D] text-white'
                  : 'bg-white/90 text-[#7F7198] border border-[#E9E3F3]'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ExportModal({ onClose }) {
  function handleExport(format) {
    alert(`Export as ${format} coming soon`)
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Export Data</h2>
            <div className="w-12" />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleExport('JSON')}
              className="w-full py-3 rounded-2xl bg-white/90 text-[#24143F] text-sm font-semibold border border-[#E9E3F3] active:bg-[#F4F0FB] transition-colors"
            >
              Export as JSON
            </button>
            <button
              onClick={() => handleExport('CSV')}
              className="w-full py-3 rounded-2xl bg-white/90 text-[#24143F] text-sm font-semibold border border-[#E9E3F3] active:bg-[#F4F0FB] transition-colors"
            >
              Export as CSV
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function AccountsModal({ accounts, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Accounts</h2>
            <div className="w-12" />
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#8F889B] font-medium">No accounts added yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map(account => (
                <div key={account.id} className="bg-white/90 rounded-2xl p-4 border border-[#E9E3F3]">
                  <p className="font-semibold text-[#24143F]">{account.name}</p>
                  <p className="text-sm text-[#7F7198] mt-1">Balance: ${account.balance?.toLocaleString() || '0'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function RecurringSettingsTab({ recurring, payFromOptions, userId, onEdit, onClose }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Recurring</h2>
            <div className="w-12" />
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl bg-[#180B3D] text-white text-sm font-semibold flex items-center justify-center gap-2 mb-4"
          >
            + Add recurring expense
          </button>

          {recurring.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#8F889B] font-medium">No recurring expenses</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recurring.map(item => (
                <div
                  key={item.id}
                  onClick={() => onEdit(item)}
                  className="bg-white/90 rounded-2xl p-4 border border-[#E9E3F3] cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-[#24143F]">{item.name}</p>
                      <p className="text-xs text-[#7F7198]">{item.dueDay}th of every month</p>
                    </div>
                    <p className="font-bold text-[#24143F]">${item.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <RecurringFormModal
              item={null}
              payFromOptions={payFromOptions}
              userId={userId}
              onClose={() => setShowForm(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}

function RecurringFormModal({ item, payFromOptions, userId, onClose }) {
  const [name, setName] = useState(item?.name || '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [dueDay, setDueDay] = useState(item ? String(item.dueDay) : '')
  const [category] = useState(item?.category || '')
  const [source, setSource] = useState(item?.cardName || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name || !amount || !dueDay) return
    setSaving(true)
    try {
      const selected = source ? payFromOptions.find(o => o.label === source) : null
      const payload = {
        name,
        amount: parseFloat(amount),
        dueDay: parseInt(dueDay),
        category: category || 'other',
        cardName: source || null,
        sourceId: selected?.id || null,
        sourceType: selected?.sourceType || null,
      }
      if (item) {
        await updateDocument('recurring', item.id, payload)
      } else {
        await addDocument('recurring', userId, payload)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteDocument('recurring', item.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-[#D8CEE8] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">{item ? 'Edit' : 'New'} recurring</h2>
            <button onClick={handleSave} disabled={saving || !name || !amount || !dueDay}
              className="text-[#9E76F4] font-semibold text-[15px] disabled:text-[#7F7198]">Save</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Name</p>
              <input type="text" placeholder="e.g. Netflix"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Amount</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-[#7F7198]">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="flex-1 text-2xl font-bold text-[#24143F] bg-transparent outline-none placeholder:text-[#4B376E]" />
              </div>
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Due day of month</p>
              <input type="number" inputMode="numeric" placeholder="e.g. 15" min="1" max="31"
                value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            {payFromOptions.length > 0 && (
              <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
                <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-3">Paid from</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSource('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${!source ? 'bg-[#180B3D] text-white' : 'bg-[#E9E3F3] text-[#7F7198]'}`}>Other</button>
                  {payFromOptions.map(o => (
                    <button key={o.id} onClick={() => setSource(o.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${source === o.label ? 'bg-[#180B3D] text-white' : 'bg-[#E9E3F3] text-[#7F7198]'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
                Delete recurring
              </button>
            )}
            {item && confirmDelete && (
              <div className="bg-red-900/30 rounded-2xl p-4 flex flex-col gap-2 border border-red-500/20">
                <p className="text-sm font-semibold text-red-400 text-center">Delete this recurring?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F2EEF8] text-[#7F7198] text-sm font-semibold">Cancel</button>
                  <button onClick={handleDelete} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function CategoriesTab({ onClose }) {
  const {
    expenseCategories, incomeCategories, hidden,
    hideCategory, unhideCategory, deleteCustom, addCustom, isBuiltIn,
  } = useCategories()
  const [editingCat, setEditingCat] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState('expense')
  const [showHidden, setShowHidden] = useState(false)

  function handleEditCategory(cat, type) {
    setEditingCat({ ...cat, type })
  }

  function handleDeleteCategory(id, type) {
    if (isBuiltIn(id)) hideCategory(id)
    else deleteCustom(id, type)
  }

  const allHiddenBuiltins = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].filter(c => hidden.includes(c.id))

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/28 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 finance-dashboard-bg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Categories</h2>
            <div className="w-12" />
          </div>

          <p className="text-xs text-[#8F889B] mb-4">Tap a category to edit or delete it</p>

          <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-[#4B376E] mb-3">Expense Categories</p>
        <div className="grid grid-cols-4 gap-2">
          {expenseCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'expense')}
              className="bg-white/90 rounded-2xl p-3 border border-[#E9E3F3] text-center cursor-pointer active:scale-95 transition-transform hover:bg-[#F4F0FB]"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-[#7F7198] leading-tight">{cat.label}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setAddType('expense')
            setShowAddForm(true)
          }}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-[#7F7198] bg-[#E9E3F3] active:scale-95 transition-transform"
        >
          + Add expense category
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-[#4B376E] mb-3">Income Categories</p>
        <div className="grid grid-cols-4 gap-2">
          {incomeCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'income')}
              className="bg-white/90 rounded-2xl p-3 border border-[#E9E3F3] text-center cursor-pointer active:scale-95 transition-transform hover:bg-[#F4F0FB]"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-[#7F7198] leading-tight">{cat.label}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setAddType('income')
            setShowAddForm(true)
          }}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-[#7F7198] bg-[#E9E3F3] active:scale-95 transition-transform"
        >
          + Add income category
        </button>
      </div>

      {allHiddenBuiltins.length > 0 && (
        <div>
          <button
            onClick={() => setShowHidden(s => !s)}
            className="text-sm font-semibold text-[#8F889B] mb-3"
          >
            {showHidden ? '▾' : '▸'} Hidden categories ({allHiddenBuiltins.length})
          </button>
          {showHidden && (
            <div className="grid grid-cols-4 gap-2">
              {allHiddenBuiltins.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => unhideCategory(cat.id)}
                  className="bg-[#E9E3F3] rounded-2xl p-3 text-center cursor-pointer active:scale-95 transition-transform opacity-50 hover:opacity-100"
                >
                  <p className="text-2xl mb-1">{cat.emoji}</p>
                  <p className="text-xs font-medium text-[#7F7198] leading-tight">{cat.label}</p>
                  <p className="text-[9px] text-[#9E76F4] font-semibold mt-1">Restore</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {editingCat && (
        <CategoryEditor
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onDelete={(id) => {
            handleDeleteCategory(id, editingCat.type)
            setEditingCat(null)
          }}
          onSave={(updated) => {
            if (isBuiltIn(updated.id)) {
              // Save edits to a built-in by adding a custom override (also hides original)
              hideCategory(updated.id)
              addCustom({ ...updated, id: `custom-${updated.id}-${Date.now()}` }, editingCat.type)
            } else {
              addCustom(updated, editingCat.type)
            }
            setEditingCat(null)
          }}
        />
      )}

      {showAddForm && (
        <AddCategoryForm
          type={addType}
          onClose={() => setShowAddForm(false)}
          onAdd={(newCat) => {
            addCustom(newCat, addType)
            setShowAddForm(false)
          }}
        />
      )}
          </div>
        </div>
      </div>
    </>
  )
}

function CategoryEditor({ category, onClose, onDelete, onSave }) {
  const [emoji, setEmoji] = useState(category.emoji)
  const [label, setLabel] = useState(category.label)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/28 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-[#D8CEE8] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Edit category</h2>
            <button onClick={() => onSave({ ...category, emoji, label })}
              className="text-[#9E76F4] font-semibold text-[15px]">Save</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Emoji</p>
              <input type="text" maxLength="2" placeholder="😀"
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-full text-4xl font-semibold text-[#24143F] bg-transparent outline-none text-center" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Label</p>
              <input type="text" placeholder="e.g. Custom Category"
                value={label} onChange={e => setLabel(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold">
                Delete category
              </button>
            ) : (
              <div className="bg-red-900/30 rounded-2xl p-4 flex flex-col gap-2 border border-red-500/20">
                <p className="text-sm font-semibold text-red-400 text-center">Delete "{label}"?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#F2EEF8] text-[#7F7198] text-sm font-semibold">Cancel</button>
                  <button onClick={() => onDelete(category.id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function AddCategoryForm({ type, onClose, onAdd }) {
  const [emoji, setEmoji] = useState('📦')
  const [label, setLabel] = useState('')

  function handleAdd() {
    if (!label.trim()) return
    onAdd({
      id: `custom_${Date.now()}`,
      emoji,
      label,
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#180B3D]/42 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-[#D8CEE8] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">New {type} category</h2>
            <button onClick={handleAdd} disabled={!label.trim()}
              className="text-[#9E76F4] font-semibold text-[15px] disabled:text-[#7F7198]">Add</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Emoji</p>
              <input type="text" maxLength="2" placeholder="😀"
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-full text-4xl font-semibold text-[#24143F] bg-transparent outline-none text-center" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Label</p>
              <input type="text" placeholder="e.g. Custom Category"
                value={label} onChange={e => setLabel(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
