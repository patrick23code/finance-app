import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronRight, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, addDocument, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES } from '../constants/categories'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵', digital_wallet: '📱' }
const CAT_COLOR_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.color]))
const CAT_EMOJI_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.emoji]))
const CAT_LABEL_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.label]))

const EXAMPLES = [
  { name: 'Spotify Plan', category: 'Subscription', frequency: 'Every month, day 29', amount: 13.12, emoji: '🎧', color: 'bg-emerald-500' },
  { name: 'iCloud +6TB plan', category: 'Subscription', frequency: 'Every month, day 1', amount: 29.99, emoji: '☁️', color: 'bg-sky-500' },
  { name: 'Tesla payments', category: 'Car Loan', frequency: 'Every month, day 9', amount: 834, emoji: '🚗', color: 'bg-red-400' },
  { name: 'House rent', category: 'Rent', frequency: 'Every month, day 1', amount: 625, emoji: '🏠', color: 'bg-teal-600' },
  { name: 'StateFarm', category: 'Car Insurance', frequency: 'Every month, day 27', amount: 193, emoji: '🛡️', color: 'bg-blue-500' },
  { name: 'Google Fi', category: 'Phone Payment', frequency: 'Every month, day 11', amount: 75, emoji: '📱', color: 'bg-violet-500' },
  { name: 'ChatGPT', category: 'Subscription', frequency: 'Every month, day 21', amount: 20, emoji: '✨', color: 'bg-[#180B3D]' },
  { name: 'Gym', category: 'Subscription', frequency: 'Every month, day 1', amount: 40, emoji: '🏋️', color: 'bg-orange-400' },
]

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

function todayString() {
  return new Date().toISOString().split('T')[0]
}

function frequencyText(item) {
  if (!item.dueDay && typeof item.frequency === 'string' && item.frequency.startsWith('Every')) return item.frequency
  const frequency = item.frequency || 'monthly'
  if (frequency === 'weekly') return 'Every week'
  if (frequency === 'yearly') return `Every year, day ${item.dueDay || 1}`
  return `Every month, day ${item.dueDay || 1}`
}

export default function RecurringPage({ startOpenKey = 0 }) {
  const { user } = useAuth()
  const { data: recurring, loading } = useCollection('recurring', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  useEffect(() => {
    if (startOpenKey > 0) {
      setEditItem(null)
      setShowForm(true)
    }
  }, [startOpenKey])

  const payFromOptions = useMemo(() => [
    ...accounts.map(a => ({
      id: a.id,
      label: a.name,
      sourceType: 'account',
      icon: ACCOUNT_ICONS[a.type] || '🏦',
      data: a,
    })),
    ...debts.filter(d => d.type === 'credit_card').map(c => ({
      id: c.id,
      label: c.name,
      sourceType: 'card',
      icon: '💳',
      data: c,
    })),
  ], [accounts, debts])

  const totalMonthly = recurring.reduce((s, r) => s + (r.frequency === 'yearly' ? (r.amount || 0) / 12 : r.amount || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh finance-dashboard-bg">
      <div className="text-[#8F889B]">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32 relative">
      <div className="max-w-md mx-auto px-5 pt-10 relative z-10">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-[26px] bg-white/90 border border-[#E9E3F3] shadow-[0_12px_34px_rgba(49,28,96,0.12)] flex items-center justify-center mx-auto mb-4">
            <Repeat size={34} className="text-[#9E76F4]" />
          </div>
          <h1 className="text-[28px] font-black text-[#24143F] tracking-tight">Recurring transactions</h1>
          <p className="text-[14px] leading-5 text-[#7F7198] font-semibold mt-2">
            Add recurring transactions for expenses you know will happen regularly.
          </p>
        </div>

        <div className="rounded-[24px] bg-white/92 border border-[#E9E3F3] shadow-[0_12px_34px_rgba(49,28,96,0.10)] p-5 mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8F889B] mb-2">Monthly fixed total</p>
          <p className="text-[38px] font-black tracking-tight text-[#24143F]">{fmt(totalMonthly)}</p>
          <p className="text-[12px] font-bold text-[#8F889B] mt-2">{recurring.length} active recurring item{recurring.length === 1 ? '' : 's'}</p>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[18px] font-black text-[#24143F]">Personal-Budget</h2>
            <Calendar size={18} className="text-[#9E76F4]" />
          </div>

          <div className="bg-white/92 border border-[#E9E3F3] rounded-[24px] shadow-[0_10px_30px_rgba(49,28,96,0.10)] overflow-hidden">
            {recurring.length > 0 ? recurring.map(item => (
              <RecurringRow key={item.id} item={item} onClick={() => { setEditItem(item); setShowForm(true) }} />
            )) : EXAMPLES.map((item, idx) => (
              <RecurringRow key={item.name} item={item} muted={idx > 3} />
            ))}

            <button
              onClick={() => { setEditItem(null); setShowForm(true) }}
              className="w-full px-4 py-4 flex items-center gap-3 text-left border-t border-[#E9E3F3] active:bg-[#F7F3FC] transition-colors"
            >
              <span className="w-11 h-11 rounded-full bg-[#180B3D] text-white flex items-center justify-center">
                <Plus size={20} />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-black text-[#24143F]">Create recurring transaction</span>
                <span className="block text-[12px] font-semibold text-[#8F889B]">Monthly, weekly, or yearly fixed payment</span>
              </span>
              <ChevronRight size={18} className="text-[#B4A8C8]" />
            </button>
          </div>
        </section>
      </div>

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

function RecurringRow({ item, onClick, muted = false }) {
  const category = item.category || 'other'
  const bgClass = item.color || CAT_COLOR_MAP[category] || 'bg-stone-400'
  const emoji = item.emoji || CAT_EMOJI_MAP[category] || '📦'
  const label = item.categoryName || CAT_LABEL_MAP[category] || item.category || 'Other'
  const content = (
    <>
      <span className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center text-xl flex-shrink-0 ${muted ? 'opacity-70' : ''}`}>
        {emoji}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-black text-[#24143F] truncate">{item.name}</span>
        <span className="block text-[12px] font-bold text-[#8F889B] truncate">{label}</span>
        <span className="block text-[11px] font-semibold text-[#A095B2] mt-0.5">{item.frequency ? frequencyText(item) : item.frequency || frequencyText(item)}</span>
      </span>
      <span className="text-[14px] font-black text-[#24143F]">{fmt(item.amount)}</span>
    </>
  )

  if (!onClick) {
    return <div className={`px-4 py-3 flex items-center gap-3 ${muted ? 'opacity-50' : ''}`}>{content}</div>
  }

  return (
    <button onClick={onClick} className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-[#F7F3FC] transition-colors">
      {content}
    </button>
  )
}

function RecurringForm({ item, payFromOptions, onClose, userId }) {
  const [name, setName] = useState(item?.name || '')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [category, setCategory] = useState(item?.category || 'subscriptions')
  const [sourceId, setSourceId] = useState(item?.sourceId || '')
  const [toId, setToId] = useState(item?.toAccountId || '')
  const [frequency, setFrequency] = useState(item?.frequency || 'monthly')
  const [dueDay, setDueDay] = useState(item ? String(item.dueDay || '') : '1')
  const [startDate, setStartDate] = useState(item?.startDate || todayString())
  const [endDate, setEndDate] = useState(item?.endDate || '')
  const [note, setNote] = useState(item?.note || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedSource = payFromOptions.find(o => o.id === sourceId)
  const selectedTo = payFromOptions.find(o => o.id === toId)
  const canSave = name && Number(amount) > 0 && category && sourceId && dueDay

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const categoryData = EXPENSE_CATEGORIES.find(c => c.id === category)
      const payload = {
        name,
        amount: parseFloat(amount),
        category,
        categoryName: categoryData?.label || category,
        cardName: selectedSource?.label || null,
        sourceId: selectedSource?.id || null,
        sourceType: selectedSource?.sourceType || null,
        toAccountId: selectedTo?.id || null,
        toAccountName: selectedTo?.label || null,
        frequency,
        dueDay: parseInt(dueDay),
        startDate,
        endDate: endDate || null,
        note: note || null,
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
      <button className="fixed inset-0 bg-[#180B3D]/60 backdrop-blur-sm z-[80]" onClick={onClose} aria-label="Close recurring form" />
      <div className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-[30px] max-h-[92vh] overflow-y-auto">
        <div className="max-w-md mx-auto px-5 pt-4 pb-24">
          <div className="w-10 h-1 bg-[#D8D0E8] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#F2EEF8] flex items-center justify-center text-[#4B376E]">
              <X size={18} />
            </button>
            <h2 className="text-[17px] font-black text-[#24143F]">{item ? 'Edit recurring' : 'New recurring'}</h2>
            <button onClick={handleSave} disabled={saving || !canSave}
              className="text-[#9E76F4] font-black text-[15px] disabled:text-[#B4A8C8]">
              Save
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <FormField label="Transaction name" value={name} onChange={setName} placeholder="Spotify Plan" />
            <FormField label="Amount" value={amount} onChange={setAmount} placeholder="13.12" type="number" prefix="$" />

            <div className="bg-white rounded-[20px] p-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-black text-[#8F889B] uppercase tracking-wide mb-3">Category</p>
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                {EXPENSE_CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                    <span className={`w-12 h-12 rounded-full flex items-center justify-center text-xl text-white ${c.color} ${category === c.id ? 'ring-2 ring-[#9E76F4] ring-offset-2 ring-offset-white' : ''}`}>
                      {c.emoji}
                    </span>
                    <span className="text-[10px] font-bold text-[#4B376E] leading-tight text-center truncate w-full">{c.label.replace(' & Dining', '')}</span>
                  </button>
                ))}
              </div>
            </div>

            <SelectField label="From account/card" value={sourceId} onChange={setSourceId} options={payFromOptions} placeholder="Select account" />
            <SelectField label="To account/card" value={toId} onChange={setToId} options={[{ id: '', label: 'Optional / None' }, ...payFromOptions]} placeholder="Optional / None" />

            <div className="bg-[#F7F3FC] rounded-[20px] p-1 flex border border-[#E9E3F3]">
              {['monthly', 'weekly', 'yearly'].map(option => (
                <button key={option} onClick={() => setFrequency(option)} className={`flex-1 py-2.5 rounded-[15px] text-xs font-black capitalize ${frequency === option ? 'bg-white text-[#24143F] shadow-sm' : 'text-[#8F889B]'}`}>
                  {option}
                </button>
              ))}
            </div>

            <FormField label="Day of month" value={dueDay} onChange={setDueDay} placeholder="1" type="number" />
            <FormField label="Start date" value={startDate} onChange={setStartDate} type="date" />
            <FormField label="End date" value={endDate} onChange={setEndDate} type="date" placeholder="Optional" />
            <FormField label="Note" value={note} onChange={setNote} placeholder="Optional note" />

            {item && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete recurring
              </button>
            )}
            {item && confirmDelete && (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2 border border-red-200">
                <p className="text-sm font-semibold text-red-500 text-center">Delete this recurring transaction?</p>
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

function FormField({ label, value, onChange, placeholder = '', type = 'text', prefix }) {
  return (
    <div className="bg-[#F7F3FC] rounded-[20px] px-4 py-4 border border-[#E9E3F3]">
      <p className="text-[10px] font-black text-[#8F889B] uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xl font-black text-[#7F7198]">{prefix}</span>}
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full text-[15px] font-bold text-[#24143F] bg-transparent outline-none placeholder:text-[#B4A8C8]"
        />
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="bg-[#F7F3FC] rounded-[20px] px-4 py-4 border border-[#E9E3F3]">
      <p className="text-[10px] font-black text-[#8F889B] uppercase tracking-wide mb-1">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[15px] font-bold text-[#24143F] bg-transparent outline-none"
      >
        <option value="">{placeholder}</option>
        {options.filter(o => o.id !== '').map(option => (
          <option key={`${label}-${option.id}`} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
