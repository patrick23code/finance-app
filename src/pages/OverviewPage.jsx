import { useMemo, useState } from 'react'
import { ChevronRight, TrendingDown, Settings, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, addDocument, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'

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
  const { data: recurring } = useCollection('recurring', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
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
    return groups
  }, [debts])

  if (loading) return <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]"><div className="text-stone-400">Loading...</div></div>

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Settings size={20} className="text-stone-600" />
            </button>
            <button onClick={() => onNavigate('add')} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Plus size={20} className="text-stone-600" />
            </button>
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

      {showSettings && (
        <SettingsSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          recurring={recurring}
          accounts={accounts}
          debts={debts}
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

function SettingsSheet({ isOpen, onClose, user, recurring, accounts, debts }) {
  const [activeTab, setActiveTab] = useState('recurring')
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [editRecurring, setEditRecurring] = useState(null)
  const [theme, setTheme] = useState('light')

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8E4DE] rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'recurring'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Recurring
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'categories'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'other'
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Other
            </button>
          </div>

          {/* Recurring Tab */}
          {activeTab === 'recurring' && (
            <RecurringSettingsTab
              recurring={recurring}
              payFromOptions={payFromOptions}
              userId={user.uid}
              onEdit={(item) => {
                setEditRecurring(item)
                setShowRecurringForm(true)
              }}
            />
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <CategoriesTab />
          )}

          {/* Other Tab */}
          {activeTab === 'other' && (
            <OtherTab theme={theme} setTheme={setTheme} />
          )}
        </div>
      </div>

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
    </>
  )
}

function RecurringSettingsTab({ recurring, payFromOptions, userId, onEdit }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 rounded-2xl bg-stone-800 text-white text-sm font-semibold flex items-center justify-center gap-2"
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
              className="bg-white rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-stone-800 text-sm">{item.name}</p>
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
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8E4DE] rounded-t-3xl max-h-[92vh] overflow-y-auto">
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

function CategoriesTab() {
  const [customExpense, setCustomExpense] = useState([])
  const [customIncome, setCustomIncome] = useState([])
  const [editingCat, setEditingCat] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addType, setAddType] = useState('expense')

  function handleEditCategory(cat, type) {
    setEditingCat({ ...cat, type })
  }

  function handleDeleteCategory(id, type) {
    if (type === 'expense') {
      setCustomExpense(prev => prev.filter(c => c.id !== id))
    } else {
      setCustomIncome(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">Expense Categories</p>
        <div className="grid grid-cols-4 gap-2">
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'expense')}
              className="bg-white rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform hover:bg-stone-50"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-stone-700 leading-tight">{cat.label}</p>
            </button>
          ))}
          {customExpense.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'expense')}
              className="bg-emerald-50 rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform border border-emerald-200"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-emerald-700 leading-tight">{cat.label}</p>
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
          {INCOME_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'income')}
              className="bg-white rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform hover:bg-stone-50"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-stone-700 leading-tight">{cat.label}</p>
            </button>
          ))}
          {customIncome.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleEditCategory(cat, 'income')}
              className="bg-emerald-50 rounded-2xl p-3 shadow-sm text-center cursor-pointer active:scale-95 transition-transform border border-emerald-200"
            >
              <p className="text-2xl mb-1">{cat.emoji}</p>
              <p className="text-xs font-medium text-emerald-700 leading-tight">{cat.label}</p>
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

      {editingCat && (
        <CategoryEditor
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onDelete={(id) => {
            handleDeleteCategory(id, editingCat.type)
            setEditingCat(null)
          }}
          onSave={(updated) => {
            if (editingCat.type === 'expense') {
              setCustomExpense(prev => [...prev.filter(c => c.id !== updated.id), updated])
            } else {
              setCustomIncome(prev => [...prev.filter(c => c.id !== updated.id), updated])
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
            if (addType === 'expense') {
              setCustomExpense(prev => [...prev, newCat])
            } else {
              setCustomIncome(prev => [...prev, newCat])
            }
            setShowAddForm(false)
          }}
        />
      )}
    </div>
  )
}

function CategoryEditor({ category, onClose, onDelete, onSave }) {
  const [emoji, setEmoji] = useState(category.emoji)
  const [label, setLabel] = useState(category.label)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8E4DE] rounded-t-3xl max-h-[92vh] overflow-y-auto">
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
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8E4DE] rounded-t-3xl max-h-[92vh] overflow-y-auto">
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

function OtherTab({ theme, setTheme }) {
  function handleExport() {
    // Placeholder for export functionality
    alert('Export functionality coming soon')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">Theme</p>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              theme === 'light'
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-stone-700 mb-3">Export Data</p>
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-2xl bg-stone-100 text-stone-600 text-sm font-semibold active:scale-95 transition-transform"
        >
          Export as JSON
        </button>
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-2xl bg-stone-100 text-stone-600 text-sm font-semibold active:scale-95 transition-transform mt-2"
        >
          Export as CSV
        </button>
      </div>

      <p className="text-xs text-stone-400 text-center">More settings coming soon</p>
    </div>
  )
}
