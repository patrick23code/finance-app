import { useState, useEffect } from 'react'
import { ChevronLeft, PlaySquare, Music, Globe, Cpu, CreditCard, Play, LayoutGrid, Zap, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { addDocument, updateDocument, deleteDocument, useCollection } from '../hooks/useFirestore'

const TECH_ICONS = [
  { id: 'youtube', Icon: PlaySquare },
  { id: 'music', Icon: Music },
  { id: 'web', Icon: Globe },
  { id: 'tech', Icon: Cpu },
  { id: 'card', Icon: CreditCard },
  { id: 'stream', Play },
  { id: 'app', Icon: LayoutGrid },
  { id: 'zap', Icon: Zap }
]

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 
  'bg-emerald-500', 'bg-sky-500', 'bg-[#9E76F4]', 'bg-rose-500',
  'bg-[#180B3D]', 'bg-amber-500', 'bg-teal-500', 'bg-red-500'
]

const FREQUENCIES = ['Monthly', 'Yearly', 'Weekly']

export default function AddSubscriptionPage({ onNavigate, editSubscription, onDone }) {
  const { user } = useAuth()
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: accounts } = useCollection('accounts', user?.uid)
  
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(editSubscription?.name || '')
  const [price, setPrice] = useState(editSubscription?.price || '')
  const [day, setDay] = useState(editSubscription?.day || '1')
  const [frequency, setFrequency] = useState(editSubscription?.frequency || 'Monthly')
  const [card, setCard] = useState(editSubscription?.card || '')
  const [icon, setIcon] = useState(editSubscription?.icon || 'app')
  const [color, setColor] = useState(editSubscription?.color || 'bg-blue-500')

  const cardOptions = [
    ...debts.filter(d => d.type === 'credit_card').map(c => c.name),
    ...accounts.map(a => a.name)
  ]

  async function handleSave() {
    if (!name || !price) return
    setSaving(true)
    const payload = {
      name,
      price: parseFloat(price),
      day: parseInt(day),
      frequency,
      card,
      icon,
      color
    }

    try {
      if (editSubscription) {
        await updateDocument('subscriptions', editSubscription.id, payload)
      } else {
        await addDocument('subscriptions', user.uid, payload)
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editSubscription) return
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      setSaving(true)
      try {
        await deleteDocument('subscriptions', editSubscription.id)
        onDone()
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="min-h-svh finance-dashboard-bg pb-24">
      <div className="max-w-md mx-auto px-5 pt-14 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => onDone()} 
            className="w-10 h-10 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-[#7F7198] active:scale-90 transition-all border border-[#E9E3F3]"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-[#24143F]">
            {editSubscription ? 'Edit Subscription' : 'New Subscription'}
          </h1>
          <button 
            onClick={handleSave} 
            disabled={saving || !name || !price}
            className="text-[#9E76F4] font-bold text-[15px] disabled:text-[#B8AEC6]"
          >
            Save
          </button>
        </div>

        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-white/90 rounded-[32px] p-6 shadow-[0_18px_42px_rgba(49,28,96,0.08)] border border-[#E9E3F3]">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className={`w-20 h-20 rounded-3xl ${color} flex items-center justify-center text-white shadow-lg transition-colors`}>
                {(() => {
                  const IconComp = (TECH_ICONS.find(i => i.id === icon) || TECH_ICONS[TECH_ICONS.length - 1]).Icon || LayoutGrid
                  return <IconComp size={40} />
                })()}
              </div>
              <input 
                type="text" 
                placeholder="Subscription Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-center text-2xl font-black text-[#24143F] bg-transparent outline-none placeholder:text-[#A69BB5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F2EEF8] rounded-2xl p-4">
                <p className="text-[10px] font-bold text-[#7F7198] uppercase tracking-wider mb-1">Monthly Price</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-[#7F7198]">$</span>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full text-lg font-bold text-[#24143F] bg-transparent outline-none placeholder:text-[#A69BB5]"
                  />
                </div>
              </div>
              <div className="bg-[#F2EEF8] rounded-2xl p-4">
                <p className="text-[10px] font-bold text-[#7F7198] uppercase tracking-wider mb-1">Payment Day</p>
                <input 
                  type="number" 
                  min="1" 
                  max="31"
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  className="w-full text-lg font-bold text-[#24143F] bg-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            <h2 className="text-[#7F7198] text-[11px] font-bold uppercase tracking-widest px-2">Settings</h2>
            
            <div className="bg-white/90 rounded-[32px] p-2 shadow-[0_18px_42px_rgba(49,28,96,0.08)] border border-[#E9E3F3]">
              <div className="p-4 border-b border-[#E9E3F3]">
                <p className="text-xs font-bold text-[#7F7198] mb-3">Billing Cycle</p>
                <div className="flex gap-2">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f}
                      onClick={() => setFrequency(f)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${frequency === f ? 'bg-[#180B3D] text-white shadow-md' : 'bg-[#F2EEF8] text-[#8F889B]'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-b border-[#E9E3F3]">
                <p className="text-xs font-bold text-[#7F7198] mb-3">Payment Method</p>
                <div className="flex gap-2 flex-wrap">
                  {cardOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => setCard(c)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${card === c ? 'bg-[#180B3D] text-white shadow-md' : 'bg-[#F2EEF8] text-[#8F889B]'}`}
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    onClick={() => setCard('Other')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${card === 'Other' || !card ? 'bg-[#180B3D] text-white shadow-md' : 'bg-[#F2EEF8] text-[#8F889B]'}`}
                  >
                    Other
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-[#E9E3F3]">
                <p className="text-xs font-bold text-[#7F7198] mb-3">Icon</p>
                <div className="grid grid-cols-4 gap-2">
                  {TECH_ICONS.map(({ id, Icon: IconComp }) => (
                    <button
                      key={id}
                      onClick={() => setIcon(id)}
                      className={`h-12 rounded-xl flex items-center justify-center transition-all ${icon === id ? 'bg-[#F2EEF8] text-[#9E76F4] border-2 border-[#9E76F4]' : 'bg-[#F2EEF8] text-[#7F7198]'}`}
                    >
                      {IconComp ? <IconComp size={20} /> : <Play size={20} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs font-bold text-[#7F7198] mb-3">Color Label</p>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-8 rounded-lg ${c} transition-all ${color === c ? 'ring-2 ring-offset-2 ring-[#9E76F4] scale-90' : 'opacity-80'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {editSubscription && (
            <button
              onClick={handleDelete}
              className="w-full py-4 flex items-center justify-center gap-2 text-red-500 font-bold text-sm bg-red-50 rounded-[28px] active:scale-[0.98] transition-all"
            >
              <Trash2 size={18} />
              Delete Subscription
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
