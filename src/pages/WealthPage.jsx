import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, updateDocument, deleteDocument } from '../hooks/useFirestore'
import MonkeyLogo from '../components/MonkeyLogo'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }

const CARD_COLORS = [
  { id: 'navy', label: 'Navy', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)' },
  { id: 'black', label: 'Black', gradient: 'linear-gradient(135deg, #1f2937 0%, #000000 100%)' },
  { id: 'emerald', label: 'Emerald', gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  { id: 'rose', label: 'Rose', gradient: 'linear-gradient(135deg, #e11d48 0%, #881337 100%)' },
  { id: 'purple', label: 'Purple', gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)' },
  { id: 'amber', label: 'Amber', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' },
  { id: 'sky', label: 'Sky', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #075985 100%)' },
  { id: 'slate', label: 'Slate', gradient: 'linear-gradient(135deg, #64748b 0%, #1e293b 100%)' },
  { id: 'rainbow', label: 'Rainbow', gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)' },
]

const COLOR_MAP = Object.fromEntries(CARD_COLORS.map(c => [c.id, c.gradient]))

const DOLLAR_PATTERN = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <text x="20" y="30" font-family="system-ui, sans-serif" font-size="22" font-weight="900" fill="%2310b981" opacity="0.07">$</text>
  <text x="50" y="65" font-family="system-ui, sans-serif" font-size="18" font-weight="900" fill="%2310b981" opacity="0.05">$</text>
  <text x="5" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="%2310b981" opacity="0.06">$</text>
</svg>
`)}`

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function WealthPage({ onNavigate, onAccountClick }) {
  const { user } = useAuth()
  const { data: accounts, loading } = useCollection('accounts', user?.uid)
  const [editItem, setEditItem] = useState(null)

  const totalWealth = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh bg-slate-50">
      <div className="text-stone-400">Loading...</div>
    </div>
  )

  return (
    <div
      className="min-h-svh bg-slate-50 pb-24"
      style={{
        backgroundImage: `url("${DOLLAR_PATTERN}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '80px 80px',
      }}
    >
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Header with Logo */}
        <div className="flex items-center justify-center mb-6">
          <MonkeyLogo size={42} className="text-slate-900" />
        </div>

        <p className="text-slate-500 text-sm mb-1 font-medium">Net worth</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">Wealth</h1>

        {/* Total — Green Gradient */}
        <div
          className="rounded-2xl p-6 mb-4 relative overflow-hidden animate-scale-in"
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
            boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.4)',
          }}
        >
          {/* Decorative $ patterns */}
          <div className="absolute -top-4 -right-4 text-white/10 text-9xl font-black select-none pointer-events-none">$</div>
          <div className="absolute -bottom-8 -left-2 text-white/5 text-8xl font-black select-none pointer-events-none">$</div>

          <div className="relative">
            <p className="text-emerald-50 text-[11px] font-bold uppercase tracking-widest mb-2">Total balance</p>
            <p className="text-[44px] font-bold text-white tracking-tight leading-none mb-2">{fmt(totalWealth)}</p>
            <p className="text-emerald-100 text-xs font-medium">Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Accounts list */}
        {accounts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 font-medium">No accounts yet</p>
            <p className="text-slate-400 text-sm mt-1">Add an account from the Add tab</p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold"
              style={{ boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.45)' }}
            >
              Add account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {accounts.map((a, idx) => {
              const gradient = COLOR_MAP[a.color] || COLOR_MAP.navy
              return (
                <div
                  key={a.id}
                  onClick={() => onAccountClick(a)}
                  className="rounded-2xl p-5 cursor-pointer active:scale-[0.98] transition-transform animate-scale-in relative overflow-hidden"
                  style={{
                    background: gradient,
                    aspectRatio: '1.586 / 1',
                    boxShadow: '0 12px 32px -8px rgba(0,0,0,0.3)',
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  {/* Decorative chip */}
                  <div className="absolute top-5 right-5 w-10 h-7 rounded-md bg-white/20 border border-white/30" />
                  {/* Decorative shine */}
                  <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />

                  <div className="relative flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{ACCOUNT_ICONS[a.type] || '🏦'}</span>
                        {a.bank && <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{a.bank}</p>}
                      </div>
                      <p className="text-white text-lg font-bold tracking-tight">{a.name}</p>
                    </div>

                    {a.last4 && (
                      <p className="text-white/90 text-base font-mono tracking-[0.3em] my-2">•••• •••• •••• {a.last4}</p>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-0.5">Balance</p>
                        <p className="text-2xl font-bold text-white tracking-tight">{fmt(a.balance)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditItem(a) }}
                        className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Edit2 size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {editItem && (
          <AccountEditSheet
            account={editItem}
            onClose={() => setEditItem(null)}
            userId={user.uid}
          />
        )}
      </div>
    </div>
  )
}

function AccountEditSheet({ account, onClose, userId }) {
  const [name, setName] = useState(account.name)
  const [bank, setBank] = useState(account.bank || '')
  const [balance, setBalance] = useState(String(account.balance || 0))
  const [last4, setLast4] = useState(account.last4 || '')
  const [color, setColor] = useState(account.color || 'navy')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name) return
    setSaving(true)
    try {
      await updateDocument('accounts', account.id, {
        name,
        bank: bank || null,
        balance: parseFloat(balance) || 0,
        last4: last4 || null,
        color,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteDocument('accounts', account.id)
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
            <h2 className="text-[17px] font-bold text-stone-800">Edit account</h2>
            <button onClick={handleSave} disabled={saving || !name}
              className="text-stone-800 font-semibold text-[15px] disabled:text-stone-300">
              Save
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Name</p>
              <input type="text" placeholder="e.g. Chase Debit"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Bank (optional)</p>
              <input type="text" placeholder="e.g. Chase"
                value={bank} onChange={e => setBank(e.target.value)}
                className="w-full text-[15px] font-semibold text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Balance</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-stone-300">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={balance} onChange={e => setBalance(e.target.value)}
                  className="flex-1 text-2xl font-bold text-stone-800 bg-transparent outline-none placeholder:text-stone-200" />
              </div>
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Last 4 digits</p>
              <input type="text" maxLength="4" placeholder="1234"
                value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))}
                className="w-full text-[15px] font-semibold tracking-widest text-stone-800 bg-transparent outline-none placeholder:text-stone-300" />
            </div>

            <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Card color</p>
              <div className="grid grid-cols-3 gap-2">
                {CARD_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`h-12 rounded-xl active:scale-95 transition-transform ${color === c.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    style={{ background: c.gradient }}
                  >
                    {color === c.id && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete account
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-600 text-center">Delete this account?</p>
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
