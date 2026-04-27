import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, TrendingDown, Settings, Plus, Zap, Grid3X3, Repeat, Download, Moon, DollarSign, X, CreditCard, Landmark, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, addDocument, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'
import { useCountUp } from '../hooks/useCountUp'
import { useCategories } from '../hooks/useCategories'
import BankLogo from '../components/BankLogo'
import MonkeyLogo from '../components/MonkeyLogo'
import DonutChart from '../components/DonutChart'

const DEBT_COLORS = {
  loan: '#0F172A',
  credit_card: '#F59E0B',
  personal: '#10B981',
}

const DEBT_CARD_STYLES = {
  credit_card: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', accent: '#F59E0B' },
  loan: { iconBg: 'bg-slate-100', iconColor: 'text-slate-700', accent: '#0F172A' },
  personal: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', accent: '#10B981' },
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

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtShort(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function OverviewPage({ onNavigate, onDebtClick }) {
  const { user, logout } = useAuth()
  const { data: debts, loading } = useCollection('debts', user?.uid)
  const { data: recurring } = useCollection('recurring', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const { data: transactions } = useCollection('transactions', user?.uid)
  const [showSettings, setShowSettings] = useState(false)

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const totals = useMemo(() => {
    const byType = { loan: 0, credit_card: 0, personal: 0 }
    let total = 0
    debts.forEach(d => {
      byType[d.type] = (byType[d.type] || 0) + (d.remaining || 0)
      total += d.remaining || 0
    })
    return { byType, total }
  }, [debts])

  const upcoming = useMemo(() => {
    return [...debts]
      .filter(d => d.dueDay)
      .sort((a, b) => {
        const dayA = a.dueDay <= today.getDate() ? a.dueDay + 31 : a.dueDay
        const dayB = b.dueDay <= today.getDate() ? b.dueDay + 31 : b.dueDay
        return dayA - dayB
      })
      .slice(0, 3)
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

  const animatedTotal = useCountUp(totals.total)

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-slate-50"><div className="text-slate-400">Loading...</div></div>

  const donutSegments = Object.entries(totals.byType)
    .filter(([_, val]) => val > 0)
    .map(([type, val]) => ({ name: DEBT_LABELS[type], value: val, color: DEBT_COLORS[type] }))

  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-6">
          <button onClick={() => setShowSettings(true)} className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 active:scale-95 transition-transform">
            <Settings size={18} className="text-slate-700" />
          </button>
          <MonkeyLogo size={42} className="text-slate-900" />
          <button onClick={logout} className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden active:scale-95 transition-transform">
            <img src={user?.photoURL} alt="" className="w-10 h-10 rounded-2xl object-cover" onError={e => e.target.style.display='none'} />
          </button>
        </div>

        {/* Hero Total Debts Card */}
        <div className="bg-white rounded-2xl p-6 mb-6 animate-scale-in border border-slate-100" style={{ boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.08)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-[11px] font-semibold tracking-wide uppercase mb-1">Total debt</p>
              <p className="text-[40px] font-bold text-slate-900 tracking-tight leading-none mb-2">{fmt(animatedTotal)}</p>
              <p className="text-xs text-slate-500 font-medium">Across {debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
            </div>
            {donutSegments.length > 0 && (
              <DonutChart
                segments={donutSegments}
                size={96}
                strokeWidth={11}
              />
            )}
          </div>

          {totals.total > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
              {Object.entries(totals.byType).map(([type, val]) => {
                if (val === 0) return null
                const pct = totals.total ? Math.round((val / totals.total) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DEBT_COLORS[type] }} />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{DEBT_LABELS[type]}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{fmtShort(val)}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{pct}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Debt Groups */}
        {Object.entries(byType).map(([type, items], idx) => (
          <div key={type} className="mb-5 animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                {DEBT_LABELS[type]} <span className="text-slate-400 font-medium ml-0.5">{items.length}</span>
              </span>
              <span className="text-xs text-slate-500 font-semibold">{fmt(items.reduce((s, d) => s + (d.remaining || 0), 0))}</span>
            </div>
            {type === 'personal' ? (
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-100" style={{ boxShadow: '0 4px 12px -4px rgba(15, 23, 42, 0.04)' }}>
                {items.map((d, i) => (
                  <PersonalDebtRow key={d.id} debt={d} last={i === items.length - 1} onClick={() => onDebtClick(d)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map(d => (
                  <DebtCard key={d.id} debt={d} color={DEBT_COLORS[type]} onClick={() => onDebtClick(d)} />
                ))}
              </div>
            )}
          </div>
        ))}

        {debts.length === 0 && (
          <div className="text-center py-16">
            <TrendingDown size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">No debts added yet</p>
            <p className="text-slate-500 text-sm mt-1">Tap Add to get started</p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold"
              style={{ boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)' }}
            >
              Add your first debt
            </button>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onNavigate={onNavigate}
          user={user}
          recurring={recurring}
          accounts={accounts}
          debts={debts}
          transactions={transactions}
        />
      )}
    </div>
  )
}

const AVATAR_COLORS = [
  'bg-orange-300', 'bg-blue-300', 'bg-green-300', 'bg-purple-300',
  'bg-pink-300', 'bg-yellow-300', 'bg-teal-300', 'bg-red-300',
]

function avatarColor(name) {
  const i = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

function PersonalDebtRow({ debt, last, onClick }) {
  const isOwesYou = debt.direction === 'they_owe'
  const since = debt.since ? new Date(debt.since + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : null

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors cursor-pointer" onClick={onClick}>
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-emerald-600" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-[15px]">{debt.person || debt.name}</p>
          <p className="text-xs text-slate-500 truncate font-medium">
            {debt.for && `${debt.for}`}{since && ` · since ${since}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-[15px] tracking-tight ${isOwesYou ? 'text-emerald-600' : 'text-slate-900'}`}>
            {isOwesYou ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(debt.remaining)}
          </p>
          <p className={`text-[10px] font-bold tracking-wide ${isOwesYou ? 'text-emerald-500' : 'text-slate-500'}`}>
            {isOwesYou ? 'OWES YOU' : 'YOU OWE'}
          </p>
        </div>
      </div>
      {!last && <div className="h-px bg-slate-100 mx-4" />}
    </>
  )
}

function DebtCard({ debt, color, onClick }) {
  const isCC = debt.type === 'credit_card'
  const pct = isCC
    ? (debt.creditLimit ? Math.min(100, (debt.remaining / debt.creditLimit) * 100) : 0)
    : (debt.originalAmount ? Math.min(100, ((debt.originalAmount - debt.remaining) / debt.originalAmount) * 100) : 0)

  const available = isCC && debt.creditLimit ? debt.creditLimit - debt.remaining : null
  const segments = 20

  const [barPct, setBarPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarPct(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  const styles = DEBT_CARD_STYLES[debt.type] || DEBT_CARD_STYLES.loan
  const Icon = DEBT_ICONS[debt.type] || Landmark

  return (
    <div
      className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer border border-slate-100"
      style={{ boxShadow: '0 4px 12px -4px rgba(15, 23, 42, 0.04)' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-2xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={styles.iconColor} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          {debt.bank && <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{debt.bank}</p>}
          <p className="font-bold text-slate-900 text-[15px] tracking-tight">
            {debt.name}
            {debt.last4 && <span className="text-slate-400 font-medium"> ·{debt.last4}</span>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-slate-900 text-lg tracking-tight">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(debt.remaining)}</p>
          {isCC && debt.creditLimit && (
            <p className="text-[10px] text-slate-500 font-medium">of {debt.creditLimit >= 1000 ? `$${(debt.creditLimit/1000).toFixed(0)}k` : `$${debt.creditLimit}`}</p>
          )}
          {!isCC && <p className="text-[10px] text-slate-500 font-medium">remaining</p>}
        </div>
      </div>

      {/* Sleek thin progress bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barPct}%`,
            backgroundColor: isCC
              ? (pct >= 85 ? '#EF4444' : pct >= 65 ? '#F59E0B' : '#10B981')
              : (pct >= 80 ? '#10B981' : pct >= 50 ? '#3B82F6' : '#0F172A'),
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-2">
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

function SettingsSheet({ isOpen, onClose, onNavigate, user, recurring, accounts, debts, transactions }) {
  const [activeModal, setActiveModal] = useState(null)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [editRecurring, setEditRecurring] = useState(null)
  const [theme, setTheme] = useState('light')

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Total Days: unique transaction dates
    const uniqueDates = new Set(transactions.map(t => t.date || '').filter(d => d))
    const totalDays = uniqueDates.size

    // Transactions this month
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const thisMonthTransactions = transactions.filter(t => (t.date || '').startsWith(monthStr))
    const transactionCount = thisMonthTransactions.length

    // Current Streak: consecutive days with transactions (backwards from today)
    let streak = 0
    let checkDate = new Date(today)
    checkDate.setHours(0, 0, 0, 0)
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasTransaction = transactions.some(t => t.date === dateStr)
      if (hasTransaction) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return { streak, totalDays, transactionCount }
  }, [transactions])

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-24">
          <div className="flex justify-between items-center mb-4">
            <div className="w-10 h-1 bg-stone-300 rounded-full" />
            <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full transition-colors">
              <X size={20} className="text-stone-600" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={user?.photoURL}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
                onError={e => e.target.style.display = 'none'}
              />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-900 truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Settings Sections */}

          {/* Quick Actions */}
          <SettingsSection title="Quick Actions">
            <SettingItem
              icon={<Plus size={20} />}
              iconBg="bg-blue-100"
              label="Add New Debt"
              description="Add a credit card, loan, or personal debt"
              onClick={() => { onClose(); onNavigate?.('add') }}
            />
          </SettingsSection>

          {/* Account Management */}
          <SettingsSection title="Account Management">
            <SettingItem
              icon={<Grid3X3 size={20} />}
              iconBg="bg-blue-200"
              label="Category Manager"
              description="Manage expense & income categories"
              onClick={() => setActiveModal('categories')}
            />
          </SettingsSection>

          {/* Payments & Planning */}
          <SettingsSection title="Payments & Planning">
            <SettingItem
              icon={<Repeat size={20} />}
              iconBg="bg-purple-200"
              label="Recurring"
              description="Set up recurring expenses"
              onClick={() => setActiveModal('recurring')}
            />
          </SettingsSection>

          {/* Data & Preferences */}
          <SettingsSection title="Data & Preferences">
            <SettingItem
              icon={<Download size={20} />}
              iconBg="bg-orange-200"
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
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 px-1">{title}</p>
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
      className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm active:bg-stone-50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center text-stone-700 flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-stone-800 text-sm">{label}</p>
        <p className="text-xs text-stone-500 truncate">{description}</p>
      </div>
      <ChevronRight size={18} className="text-stone-400 flex-shrink-0" />
    </button>
  )
}

function ThemeModal({ theme, setTheme, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">Theme</h2>
            <div className="w-12" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setTheme('light'); onClose(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-600 shadow-sm'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => { setTheme('dark'); onClose(); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-stone-800 text-white'
                  : 'bg-white text-stone-600 shadow-sm'
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">Export Data</h2>
            <div className="w-12" />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleExport('JSON')}
              className="w-full py-3 rounded-2xl bg-white text-stone-800 text-sm font-semibold shadow-sm active:bg-stone-50 transition-colors"
            >
              Export as JSON
            </button>
            <button
              onClick={() => handleExport('CSV')}
              className="w-full py-3 rounded-2xl bg-white text-stone-800 text-sm font-semibold shadow-sm active:bg-stone-50 transition-colors"
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-stone-800">Accounts</h2>
            <div className="w-12" />
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-400 font-medium">No accounts added yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map(account => (
                <div key={account.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="font-semibold text-stone-800">{account.name}</p>
                  <p className="text-sm text-stone-500 mt-1">Balance: ${account.balance?.toLocaleString() || '0'}</p>
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-stone-800">Recurring</h2>
            <div className="w-12" />
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-2xl bg-stone-800 text-white text-sm font-semibold flex items-center justify-center gap-2 mb-4"
          >
            + Add recurring expense
          </button>

          {recurring.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-400 font-medium">No recurring expenses</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recurring.map(item => (
                <div
                  key={item.id}
                  onClick={() => onEdit(item)}
                  className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-stone-800">{item.name}</p>
                      <p className="text-xs text-stone-400">{item.dueDay}th of every month</p>
                    </div>
                    <p className="font-bold text-stone-800">${item.amount}</p>
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
  const [category, setCategory] = useState(item?.category || '')
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">{item ? 'Edit' : 'New'} recurring</h2>
            <button onClick={handleSave} disabled={saving || !name || !amount || !dueDay}
              className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">Save</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Name</p>
              <input type="text" placeholder="e.g. Netflix"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Amount</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-stone-300">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="flex-1 text-2xl font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-200" />
              </div>
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Due day of month</p>
              <input type="number" inputMode="numeric" placeholder="e.g. 15" min="1" max="31"
                value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            {payFromOptions.length > 0 && (
              <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Paid from</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSource('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${!source ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>Other</button>
                  {payFromOptions.map(o => (
                    <button key={o.id} onClick={() => setSource(o.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${source === o.label ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2">
                Delete recurring
              </button>
            )}
            {item && confirmDelete && (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-600 text-center">Delete this recurring?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold">Cancel</button>
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="flex justify-between items-center mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Done</button>
            <h2 className="text-[17px] font-bold text-stone-800">Categories</h2>
            <div className="w-12" />
          </div>

          <p className="text-xs text-stone-500 mb-4">Tap a category to edit or delete it</p>

          <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">Expense Categories</p>
        <div className="grid grid-cols-4 gap-2">
          {expenseCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'expense')}
              className="bg-white rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform hover:bg-stone-50"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-stone-700 leading-tight">{cat.label}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setAddType('expense')
            setShowAddForm(true)
          }}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-stone-600 bg-stone-100 active:scale-95 transition-transform"
        >
          + Add expense category
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">Income Categories</p>
        <div className="grid grid-cols-4 gap-2">
          {incomeCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'income')}
              className="bg-white rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform hover:bg-stone-50"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-stone-700 leading-tight">{cat.label}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setAddType('income')
            setShowAddForm(true)
          }}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-stone-600 bg-stone-100 active:scale-95 transition-transform"
        >
          + Add income category
        </button>
      </div>

      {allHiddenBuiltins.length > 0 && (
        <div>
          <button
            onClick={() => setShowHidden(s => !s)}
            className="text-sm font-semibold text-stone-500 mb-3"
          >
            {showHidden ? '▾' : '▸'} Hidden categories ({allHiddenBuiltins.length})
          </button>
          {showHidden && (
            <div className="grid grid-cols-4 gap-2">
              {allHiddenBuiltins.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => unhideCategory(cat.id)}
                  className="bg-stone-100 rounded-2xl p-3 text-center cursor-pointer active:scale-95 transition-transform opacity-50 hover:opacity-100"
                >
                  <p className="text-2xl mb-1">{cat.emoji}</p>
                  <p className="text-xs font-medium text-stone-700 leading-tight">{cat.label}</p>
                  <p className="text-[9px] text-blue-600 font-semibold mt-1">Restore</p>
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">Edit category</h2>
            <button onClick={() => onSave({ ...category, emoji, label })}
              className="text-stone-800 font-semibold text-[15px]">Save</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Emoji</p>
              <input type="text" maxLength="2" placeholder="😀"
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-full text-4xl font-semibold text-stone-800 bg-transparent outline-none text-center" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Label</p>
              <input type="text" placeholder="e.g. Custom Category"
                value={label} onChange={e => setLabel(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold">
                Delete category
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-600 text-center">Delete "{label}"?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold">Cancel</button>
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
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">New {type} category</h2>
            <button onClick={handleAdd} disabled={!label.trim()}
              className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">Add</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Emoji</p>
              <input type="text" maxLength="2" placeholder="😀"
                value={emoji} onChange={e => setEmoji(e.target.value)}
                className="w-full text-4xl font-semibold text-stone-800 bg-transparent outline-none text-center" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Label</p>
              <input type="text" placeholder="e.g. Custom Category"
                value={label} onChange={e => setLabel(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

