import { useState, useRef } from 'react'
import { X, ChevronRight, Trash2, RefreshCcw, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, updateDocument, deleteDocument } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }

export default function EditTransactionSheet({ transaction, onClose }) {
  const { user } = useAuth()
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)

  const [txType, setTxType] = useState(transaction.type || 'expense')
  const [txAmount, setTxAmount] = useState(String(transaction.amount || ''))
  const [txName, setTxName] = useState(transaction.name || '')
  const [txCategory, setTxCategory] = useState(transaction.category || '')
  const [txCard, setTxCard] = useState(transaction.cardName || '')
  const [txDate, setTxDate] = useState(transaction.date || new Date().toISOString().split('T')[0])
  const [txNote, setTxNote] = useState(transaction.note || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeSheet, setActiveSheet] = useState(null) // 'category' | 'account' | 'type' | 'date' | 'amount'

  const amountRef = useRef(null)

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const currentCat = categories.find(c => c.id === txCategory) || { emoji: '📦', label: txCategory || 'None' }

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({
      id: c.id, label: c.name, sourceType: 'card', data: c,
      display: `${c.name}${c.last4 ? ` ·${c.last4}` : ''}`,
    })),
    ...accounts.map(a => ({
      id: a.id, label: a.name, sourceType: 'account', data: a,
      display: a.name,
    })),
  ]

  const currentAccount = payFromOptions.find(o => o.label === txCard)

  async function reverseBalance(sourceId, sourceType, type, amount) {
    try {
      if (sourceType === 'card') {
        const card = debts.find(d => d.id === sourceId)
        if (!card) return
        const newRemaining = type === 'expense'
          ? (card.remaining || 0) - amount
          : (card.remaining || 0) + amount
        await updateDocument('debts', sourceId, { remaining: Math.max(0, newRemaining) })
      } else if (sourceType === 'account') {
        const account = accounts.find(a => a.id === sourceId)
        if (!account) return
        const newBalance = type === 'expense'
          ? (account.balance || 0) + amount
          : (account.balance || 0) - amount
        await updateDocument('accounts', sourceId, { balance: Math.max(0, newBalance) })
      }
    } catch (e) { console.warn('Reverse balance failed:', e) }
  }

  async function applyBalance(selected, type, amount) {
    try {
      if (selected.sourceType === 'card') {
        const newRemaining = type === 'expense'
          ? (selected.data.remaining || 0) + amount
          : Math.max(0, (selected.data.remaining || 0) - amount)
        await updateDocument('debts', selected.id, { remaining: newRemaining })
      } else if (selected.sourceType === 'account') {
        const newBalance = type === 'expense'
          ? Math.max(0, (selected.data.balance || 0) - amount)
          : (selected.data.balance || 0) + amount
        await updateDocument('accounts', selected.id, { balance: newBalance })
      }
    } catch (e) { console.warn('Apply balance failed:', e) }
  }

  async function handleSave() {
    if (!txAmount || !txCategory) return
    setSaving(true)
    try {
      const newAmount = parseFloat(txAmount)
      const newSelected = txCard ? payFromOptions.find(o => o.label === txCard) : null

      if (transaction.sourceId) {
        await reverseBalance(transaction.sourceId, transaction.sourceType, transaction.type, transaction.amount)
      }

      await updateDocument('transactions', transaction.id, {
        type: txType,
        amount: newAmount,
        name: txName || currentCat.label,
        category: txCategory,
        cardName: txCard || null,
        sourceId: newSelected?.id || null,
        sourceType: newSelected?.sourceType || null,
        date: txDate,
        note: txNote || null,
      })

      if (newSelected) await applyBalance(newSelected, txType, newAmount)
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      if (transaction.sourceId) {
        await reverseBalance(transaction.sourceId, transaction.sourceType, transaction.type, transaction.amount)
      }
      await deleteDocument('transactions', transaction.id)
      onClose()
    } finally { setSaving(false) }
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return 'Not set'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const amountNum = parseFloat(txAmount) || 0
  const isIncome = txType === 'income'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Full-screen sheet */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ top: '5%' }}>
        <div className="relative bg-white rounded-t-3xl flex-1 overflow-y-auto mx-auto w-full max-w-md shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 active:bg-stone-200 transition-colors">
              <X size={18} className="text-stone-600" />
            </button>
            <h2 className="text-[17px] font-bold text-stone-800">Transaction</h2>
            <button
              onClick={handleSave}
              disabled={saving || !txAmount || !txCategory}
              className="px-4 py-1.5 rounded-full bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 active:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>

          {/* Amount Display */}
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <button
              onClick={() => { setActiveSheet('amount'); setTimeout(() => amountRef.current?.focus(), 100) }}
              className="text-5xl font-bold tracking-tight"
              style={{ color: isIncome ? '#16a34a' : '#ef4444' }}
            >
              {isIncome ? '+' : '-'}${amountNum.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </button>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              value={txAmount}
              onChange={e => setTxAmount(e.target.value)}
              onBlur={() => setActiveSheet(null)}
              className={`mt-2 text-center text-lg font-semibold bg-stone-50 rounded-2xl px-4 py-2 w-40 outline-none border-2 transition-all ${activeSheet === 'amount' ? 'border-blue-400' : 'border-transparent'}`}
              placeholder="0.00"
            />
          </div>

          {/* Detail Rows */}
          <div className="mx-4 bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm mb-4">

            {/* Name */}
            <DetailRow label="Name">
              <input
                type="text"
                value={txName}
                onChange={e => setTxName(e.target.value)}
                placeholder="Transaction name"
                className="text-right text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300 w-full max-w-[200px]"
              />
            </DetailRow>

            <Divider />

            {/* Type */}
            <DetailRow label="Type" onPress={() => setActiveSheet('type')}>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-600' : 'text-stone-700'}`}>
                  {isIncome ? 'Income' : 'Expense'}
                </span>
                <ChevronRight size={14} className="text-stone-400" />
              </div>
            </DetailRow>

            <Divider />

            {/* Category */}
            <DetailRow label="Category" onPress={() => setActiveSheet('category')}>
              <div className="flex items-center gap-2">
                <span className="text-base">{currentCat.emoji}</span>
                <span className="text-[15px] font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
                  {currentCat.label}
                </span>
                <ChevronRight size={14} className="text-stone-400" />
              </div>
            </DetailRow>

            <Divider />

            {/* Account */}
            <DetailRow label="Account" onPress={() => setActiveSheet('account')}>
              <div className="flex items-center gap-1.5">
                {currentAccount ? (
                  <span className="text-[15px] font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full max-w-[160px] truncate">
                    {currentAccount.display}
                  </span>
                ) : (
                  <span className="text-[15px] font-semibold text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
                    None
                  </span>
                )}
                <ChevronRight size={14} className="text-stone-400" />
              </div>
            </DetailRow>

            <Divider />

            {/* Recorder */}
            <DetailRow label="Recorder">
              <span className="text-[15px] font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full max-w-[180px] truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'You'}
              </span>
            </DetailRow>

            <Divider />

            {/* Date */}
            <DetailRow label="Date" onPress={() => setActiveSheet('date')}>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-semibold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
                  {formatDateDisplay(txDate)}
                </span>
                <ChevronRight size={14} className="text-stone-400" />
              </div>
            </DetailRow>
          </div>

          {/* Date Input (hidden, triggered when date row tapped) */}
          {activeSheet === 'date' && (
            <div className="mx-4 mb-4">
              <input
                type="date"
                value={txDate}
                onChange={e => { setTxDate(e.target.value); setActiveSheet(null) }}
                className="w-full bg-white rounded-2xl px-4 py-3 text-[15px] font-semibold text-stone-800 border border-stone-200 outline-none shadow-sm"
                autoFocus
              />
            </div>
          )}

          {/* Note */}
          <div className="mx-4 mb-4">
            <textarea
              value={txNote}
              onChange={e => setTxNote(e.target.value)}
              placeholder="Note..."
              rows={2}
              className="w-full bg-stone-50 rounded-2xl px-4 py-3 text-[15px] text-stone-800 border border-stone-100 outline-none resize-none placeholder:text-stone-400 shadow-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-10 pb-10 pt-4">
            {!confirmDelete ? (
              <ActionButton
                icon={<Trash2 size={22} />}
                label="Delete"
                color="bg-red-500"
                onClick={() => setConfirmDelete(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 w-full px-6">
                <p className="text-sm font-semibold text-red-600 text-center">Delete this transaction?</p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-3 rounded-2xl bg-stone-100 text-stone-600 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Picker Sheet */}
      {activeSheet === 'category' && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setActiveSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl max-h-[75vh] overflow-y-auto">
            <div className="max-w-md mx-auto px-4 pt-4 pb-10">
              <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
              <h3 className="text-[17px] font-bold text-stone-800 text-center mb-4">Category</h3>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setTxCategory(c.id); setActiveSheet(null) }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95 ${txCategory === c.id ? 'bg-stone-800' : 'bg-stone-50 hover:bg-stone-100'}`}
                  >
                    <span className="text-2xl">{c.emoji}</span>
                    <span className={`text-[10px] font-semibold leading-tight text-center ${txCategory === c.id ? 'text-white' : 'text-stone-500'}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Type Picker Sheet */}
      {activeSheet === 'type' && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setActiveSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl">
            <div className="max-w-md mx-auto px-4 pt-4 pb-10">
              <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
              <h3 className="text-[17px] font-bold text-stone-800 text-center mb-4">Type</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => { setTxType('expense'); setTxCategory(''); setActiveSheet(null) }}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${txType === 'expense' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  Expense
                </button>
                <button
                  onClick={() => { setTxType('income'); setTxCategory(''); setActiveSheet(null) }}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${txType === 'income' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  Income
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Account Picker Sheet */}
      {activeSheet === 'account' && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setActiveSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl">
            <div className="max-w-md mx-auto px-4 pt-4 pb-10">
              <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-4" />
              <h3 className="text-[17px] font-bold text-stone-800 text-center mb-4">Account</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setTxCard(''); setActiveSheet(null) }}
                  className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all ${!txCard ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                >
                  None
                </button>
                {payFromOptions.map(o => (
                  <button
                    key={o.id}
                    onClick={() => { setTxCard(o.label); setActiveSheet(null) }}
                    className={`w-full py-3 px-4 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${txCard === o.label ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700'}`}
                  >
                    {o.sourceType === 'account' && <span>{ACCOUNT_ICONS[o.data.type] || '🏦'}</span>}
                    {o.sourceType === 'card' && <span>💳</span>}
                    <span>{o.display}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function DetailRow({ label, children, onPress }) {
  if (onPress) {
    return (
      <button
        onClick={onPress}
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-stone-50 transition-colors"
      >
        <span className="text-[15px] text-stone-500">{label}</span>
        <div className="flex items-center">{children}</div>
      </button>
    )
  }
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-[15px] text-stone-500">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-stone-100 mx-4" />
}

function ActionButton({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center shadow-md active:scale-95 transition-transform`}>
        <span className="text-white">{icon}</span>
      </div>
      <span className="text-xs font-medium text-stone-500">{label}</span>
    </button>
  )
}
