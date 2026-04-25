import { useMemo } from 'react'
import { ChevronRight, TrendingDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'

const DEBT_COLORS = {
  loan: 'bg-stone-700',
  credit_card: 'bg-orange-400',
  personal: 'bg-rose-300',
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
    return groups
  }, [debts])

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-stone-500 text-sm">{dateLabel}</p>
          </div>
          <button onClick={logout} className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center mt-1">
            <img src={user?.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" onError={e => e.target.style.display='none'} />
          </button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-stone-500 text-xs font-medium tracking-wide uppercase mb-1">Total balance</p>
          <p className="text-4xl font-bold text-stone-800 tracking-tight mb-3">{fmt(totals.total)}</p>

          {totals.total > 0 && (
            <div className="w-full h-2 rounded-full overflow-hidden flex mb-2">
              {Object.entries(totals.byType).map(([type, val]) => {
                const pct = totals.total ? (val / totals.total) * 100 : 0
                return pct > 0 ? (
                  <div key={type} className={`${DEBT_COLORS[type]} h-full`} style={{ width: `${pct}%` }} />
                ) : null
              })}
            </div>
          )}

          <div className="flex gap-4 text-xs text-stone-500">
            {Object.entries(totals.byType).map(([type, val]) =>
              val > 0 ? (
                <span key={type}>{DEBT_LABELS[type]} {fmtShort(val)}</span>
              ) : null
            )}
          </div>
        </div>

        {/* Debt Groups */}
        {Object.entries(byType).map(([type, items]) => (
          <div key={type} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">
                {DEBT_LABELS[type]} · {items.length}
              </span>
              <span className="text-xs text-stone-500">{fmt(items.reduce((s, d) => s + (d.remaining || 0), 0))}</span>
            </div>
            {type === 'personal' ? (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
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
            <TrendingDown size={40} className="text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">No debts added yet</p>
            <p className="text-stone-400 text-sm mt-1">Tap Add to get started</p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 bg-stone-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold"
            >
              Add your first debt
            </button>
          </div>
        )}
      </div>
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
  const initial = (debt.person || debt.name || '?')[0].toUpperCase()
  const since = debt.since ? new Date(debt.since + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : null

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3" onClick={onClick}>
        <div className={`w-10 h-10 rounded-full ${avatarColor(debt.person || debt.name)} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold text-sm">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 text-[15px]">{debt.person || debt.name}</p>
          <p className="text-xs text-stone-400 truncate">
            {debt.for && `${debt.for}`}{since && ` · since ${since}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-[15px] ${isOwesYou ? 'text-emerald-600' : 'text-stone-800'}`}>
            {isOwesYou ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(debt.remaining)}
          </p>
          <p className={`text-[10px] font-semibold tracking-wide ${isOwesYou ? 'text-emerald-500' : 'text-stone-400'}`}>
            {isOwesYou ? 'OWES YOU' : 'YOU OWE'}
          </p>
        </div>
      </div>
      {!last && <div className="h-px bg-stone-100 mx-4" />}
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

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-1">
        <div>
          {debt.bank && <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">{debt.bank}</p>}
          <p className="font-semibold text-stone-800">
            {debt.name}
            {debt.last4 && <span className="text-stone-400 font-normal"> ·{debt.last4}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-stone-800">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(debt.remaining)}</p>
          {isCC && debt.creditLimit && (
            <p className="text-[10px] text-stone-400">of {debt.creditLimit >= 1000 ? `$${(debt.creditLimit/1000).toFixed(0)}k` : `$${debt.creditLimit}`}</p>
          )}
          {!isCC && <p className="text-[10px] text-stone-400">remaining</p>}
        </div>
      </div>

      {/* Progress bar */}
      {isCC ? (
        <div className="flex gap-0.5 mt-3 mb-2">
          {Array.from({ length: segments }).map((_, i) => {
            const filled = i < Math.round((pct / 100) * segments)
            return <div key={i} className={`flex-1 h-1.5 rounded-sm ${filled ? 'bg-emerald-500' : 'bg-stone-150'}`} style={{ backgroundColor: filled ? '#22c55e' : '#e7e5e4' }} />
          })}
        </div>
      ) : (
        <div className="w-full h-1.5 bg-stone-100 rounded-full mt-3 mb-2">
          <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="flex justify-between text-xs text-stone-400">
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
