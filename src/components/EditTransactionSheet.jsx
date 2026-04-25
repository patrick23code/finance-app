import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const payFromOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

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
    } catch (e) {
      console.warn('Reverse balance failed:', e)
    }
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
    } catch (e) {
      console.warn('Apply balance failed:', e)
    }
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
        name: txName || (CATEGORIES.find(c => c.id === txCategory)?.label || txCategory),
        category: txCategory,
        cardName: txCard || null,
        sourceId: newSelected?.id || null,
        sourceType: newSelected?.sourceType || null,
        date: txDate,
      })

      if (newSelected) await applyBalance(newSelected, txType, newAmount)

      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      if (transaction.sourceId) {
        await reverseBalance(transaction.sourceId, transaction.sourceType, transaction.type, transaction.amount)
      }
      await deleteDocument('transactions', transaction.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8E4DE] rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pt-4 pb-10">
          <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-stone-500 font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-stone-800">Edit transaction</h2>
            <button onClick={handleSave} disabled={saving}
              className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">
              Save
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-stone-200 rounded-2xl p-1 flex">
              <button onClick={() => { setTxType('expense'); setTxCategory('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'expense' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
                Expense
              </button>
              <button onClick={() => { setTxType('income'); setTxCategory('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${txType === 'income' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}>
                Income
              </button>
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Amount</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-stone-300">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={txAmount} onChange={e => setTxAmount(e.target.value)}
                  className="flex-1 text-2xl font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-200" />
              </div>
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Description</p>
              <input type="text" placeholder="e.g. Blue Bottle Coffee"
                value={txName} onChange={e => setTxName(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Category</p>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(c => (
                  <button key={c.id} onClick={() => setTxCategory(c.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 ${txCategory === c.id ? 'bg-stone-800' : 'bg-stone-50'}`}>
                    <span className="text-xl">{c.emoji}</span>
                    <span className={`text-[9px] font-medium leading-tight text-center ${txCategory === c.id ? 'text-white' : 'text-stone-500'}`}>
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {payFromOptions.length > 0 && (
              <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">{txType === 'income' ? 'Come to' : 'Paid from'}</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setTxCard('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${!txCard ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    Other
                  </button>
                  {payFromOptions.map(o => (
                    <button key={o.id} onClick={() => setTxCard(o.label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${txCard === o.label ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {o.sourceType === 'account' && <span>{ACCOUNT_ICONS[o.data.type] || '🏦'}</span>}
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Date</p>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none" />
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete transaction
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-600 text-center">Delete this transaction?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold">
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
