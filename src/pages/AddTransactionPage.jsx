import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { addDocument, updateDocument, useCollection } from '../hooks/useFirestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }

export default function AddTransactionPage({ onNavigate }) {
  const { user } = useAuth()
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  const [saving, setSaving] = useState(false)

  const [txType, setTxType] = useState('expense')
  const [txAmount, setTxAmount] = useState('')
  const [txName, setTxName] = useState('')
  const [txCategory, setTxCategory] = useState('')
  const [txCard, setTxCard] = useState('')
  const [txTo, setTxTo] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])

  const categories = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const cardOptions = debts.filter(d => d.type === 'credit_card')
  const payFromOptions = [
    ...cardOptions.map(c => ({ id: c.id, label: c.name, sourceType: 'card', data: c })),
    ...accounts.map(a => ({ id: a.id, label: a.name, sourceType: 'account', data: a })),
  ]

  async function handleSave() {
    if (!txAmount || !txCategory) return
    setSaving(true)
    try {
      const amount = parseFloat(txAmount)
      const selected = txCard ? payFromOptions.find(o => o.label === txCard) : null
      const toCard = txTo ? cardOptions.find(c => c.id === txTo) : null

      await addDocument('transactions', user.uid, {
        type: txType,
        amount,
        name: txName || (categories.find(c => c.id === txCategory)?.label || txCategory),
        category: txCategory,
        cardName: txCard || null,
        sourceId: selected?.id || null,
        sourceType: selected?.sourceType || null,
        toId: toCard?.id || null,
        toName: toCard?.name || null,
        date: txDate,
      })

      try {
        // Update "paid from" balance
        if (selected) {
          if (selected.sourceType === 'card') {
            const newRemaining = txType === 'expense'
              ? (selected.data.remaining || 0) + amount
              : Math.max(0, (selected.data.remaining || 0) - amount)
            await updateDocument('debts', selected.id, { remaining: newRemaining })
          } else if (selected.sourceType === 'account') {
            const newBalance = txType === 'expense'
              ? Math.max(0, (selected.data.balance || 0) - amount)
              : (selected.data.balance || 0) + amount
            await updateDocument('accounts', selected.id, { balance: newBalance })
          }
        }
        // Update CC "to" balance — paying off reduces remaining
        if (toCard) {
          const newRemaining = Math.max(0, (toCard.remaining || 0) - amount)
          await updateDocument('debts', toCard.id, { remaining: newRemaining })
        }
      } catch (e) {
        console.warn('Balance update failed:', e)
      }

      onNavigate('activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => onNavigate('activity')} className="text-stone-500 font-medium text-[15px]">
            Cancel
          </button>
          <h1 className="text-[17px] font-bold text-stone-800">New transaction</h1>
          <button onClick={handleSave} disabled={saving}
            className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">
            Save
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Expense / Income */}
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

          {/* Amount */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Amount</p>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-stone-300">$</span>
              <input type="number" inputMode="decimal" placeholder="0.00"
                value={txAmount} onChange={e => setTxAmount(e.target.value)}
                className="flex-1 text-2xl font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-200" />
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Description (optional)</p>
            <input type="text" placeholder="e.g. Blue Bottle Coffee"
              value={txName} onChange={e => setTxName(e.target.value)}
              className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Category</p>
            <div className="grid grid-cols-4 gap-2">
              {categories.map(c => (
                <button key={c.id} onClick={() => setTxCategory(c.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95 ${txCategory === c.id ? `${c.color} shadow-md` : 'bg-stone-50'}`}>
                  <span className="text-xl">{c.emoji}</span>
                  <span className={`text-[9px] font-semibold leading-tight text-center ${txCategory === c.id ? 'text-white' : 'text-stone-500'}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Paid from */}
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

          {/* To (CC payment) — only for expenses */}
          {txType === 'expense' && cardOptions.length > 0 && (
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">To <span className="normal-case font-normal text-stone-300">(optional — if paying a card)</span></p>
              <div className="flex gap-2 flex-wrap mt-2">
                <button onClick={() => setTxTo('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${!txTo ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  None
                </button>
                {cardOptions.map(c => (
                  <button key={c.id} onClick={() => setTxTo(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${txTo === c.id ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Date</p>
            <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)}
              className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
