import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Repeat, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, addDocument, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES } from '../constants/categories'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }

const CATEGORIES = EXPENSE_CATEGORIES

const CAT_COLOR_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.color]))
const CAT_EMOJI_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.emoji]))

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function RecurringPage() {
  const { user } = useAuth()
  const { data: recurring, loading } = useCollection('recurring', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const totalMonthly = recurring.reduce((s, r) => s + (r.amount || 0), 0)

  const upcomingDebts = debts
    .filter(d => d.dueDay)
    .sort((a, b) => {
      const dayA = a.dueDay <= today.getDate() ? a.dueDay + 31 : a.dueDay
      const dayB = b.dueDay <= today.getDate() ? b.dueDay + 31 : b.dueDay
      return dayA - dayB
    })
    .slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh bg-slate-50">
      <div className="text-slate-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-svh bg-slate-50 pb-24 relative">
      <div className="max-w-md mx-auto px-4 pt-14">
        <p className="text-slate-500 text-sm mb-1">Monthly fixed</p>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-6">Recurring</h1>

        {/* Summary */}
        {recurring.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm animate-scale-in border-l-4 border-cyan-400">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Total monthly commitment</p>
            <p className="text-4xl font-bold text-white tracking-tight mb-3">{fmt(totalMonthly)}</p>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-full" />
            </div>
            <p className="text-slate-400 text-xs mt-2 font-medium">{recurring.length} recurring expense{recurring.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Upcoming Debt Payments */}
        {upcomingDebts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-stone-500" />
              <p className="text-xs font-semibold text-stone-500 tracking-wide uppercase">Upcoming payments</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {upcomingDebts.map((d, idx) => {
                const dueDate = new Date(today.getFullYear(), today.getMonth(), d.dueDay)
                if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1)
                const monthLabel = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
                const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
                return (
                  <div key={d.id} className="bg-cyan-50 rounded-2xl p-4 min-w-[140px] shadow-sm flex-shrink-0 animate-scale-in border-l-4 border-cyan-400" style={{ animationDelay: `${idx * 50}ms` }}>
                    <p className="text-[10px] font-semibold text-stone-400 mb-1">{monthLabel}</p>
                    <p className="font-semibold text-stone-800 text-sm leading-tight mb-2">{d.name}</p>
                    <p className="font-bold text-stone-800 mb-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.monthly)}</p>
                    <p className={`text-xs font-semibold ${daysUntil <= 3 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {daysUntil === 0 ? 'TODAY' : `${daysUntil}d left`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recurring.length === 0 ? (
          <div className="text-center py-20 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Repeat size={40} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-semibold text-lg">No recurring expenses</p>
            <p className="text-stone-400 text-sm mt-2">Add your fixed monthly bills to track them here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recurring.map((item, idx) => {
              const source = payFromOptions.find(o => o.id === item.sourceId)
              const isPaid = item.lastProcessedMonth === currentMonth
              const catId = item.category || 'other'
              const bgClass = CAT_COLOR_MAP[catId] || 'bg-stone-400'
              const emoji = CAT_EMOJI_MAP[catId] || '📦'
              const daysUntilDue = item.dueDay > new Date().getDate()
                ? item.dueDay - new Date().getDate()
                : (new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - new Date().getDate()) + item.dueDay

              return (
                <div
                  key={item.id}
                  onClick={() => { setEditItem(item); setShowForm(true) }}
                  className="bg-emerald-50 rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all animate-scale-in border-l-4 border-emerald-400"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center text-xl flex-shrink-0`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 text-sm">{item.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {ordinal(item.dueDay)} · {source?.label || 'Other'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-stone-800">{fmt(item.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {isPaid
                        ? <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-lg">✓ PAID THIS MONTH</span>
                        : <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-[9px] font-bold rounded-lg">DUE IN {daysUntilDue} DAYS</span>
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {createPortal(
        <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto px-5 flex justify-start">
            <button
              onClick={() => { setEditItem(null); setShowForm(true) }}
              className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
              style={{ boxShadow: '0 12px 28px -6px rgba(37, 99, 235, 0.5)' }}
            >
              <Plus size={26} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {showForm && (
        <RecurringForm
          item={editItem}
          payFromOptions={payFromOptions}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          userId={user.uid}
        />
      )}
    </div>
  )
}

function RecurringForm({ item, payFromOptions, onClose, userId }) {
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">{item ? 'Edit recurring' : 'New recurring'}</h2>
            <button onClick={handleSave} disabled={saving || !name || !amount || !dueDay}
              className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">
              Save
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl px-4 py-4 shadow-sm border border-stone-100/50">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Name</p>
              <input type="text" placeholder="e.g. Netflix"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl px-4 py-4 shadow-sm border border-stone-100/50">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Amount</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-stone-300">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="flex-1 text-2xl font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl px-4 py-4 shadow-sm border border-stone-100/50">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Due day of month</p>
              <input type="number" inputMode="numeric" placeholder="e.g. 15" min="1" max="31"
                value={dueDay} onChange={e => setDueDay(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Category</p>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${category === c.id ? 'bg-stone-800' : 'bg-stone-50'}`}>
                    <span className="text-xl">{c.emoji}</span>
                    <span className={`text-[9px] font-medium leading-tight text-center ${category === c.id ? 'text-white' : 'text-stone-500'}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {payFromOptions.length > 0 && (
              <div className="bg-gradient-to-br from-white to-stone-50 rounded-2xl px-4 py-4 shadow-sm border border-stone-100/50">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Paid from</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSource('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${!source ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    Other
                  </button>
                  {payFromOptions.map(o => (
                    <button key={o.id} onClick={() => setSource(o.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${source === o.label ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {o.sourceType === 'account' && <span>{ACCOUNT_ICONS[o.data.type] || '🏦'}</span>}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {item && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete recurring
              </button>
            )}
            {item && confirmDelete && (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-600 text-center">Delete this recurring expense?</p>
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
