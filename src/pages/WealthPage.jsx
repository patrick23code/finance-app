import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, updateDocument, deleteDocument } from '../hooks/useFirestore'
import MonkeyLogo from '../components/MonkeyLogo'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }
const ACCOUNT_COLORS = { checking: 'bg-blue-100', savings: 'bg-emerald-100', cash: 'bg-yellow-100' }

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
            <p className="text-stone-400 font-medium">No accounts yet</p>
            <p className="text-stone-400 text-sm mt-1">Add an account from the Add tab</p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 bg-stone-800 text-white px-6 py-3 rounded-2xl text-sm font-semibold"
            >
              Add account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-full ${ACCOUNT_COLORS[a.type] || 'bg-stone-100'} flex items-center justify-center text-xl flex-shrink-0`}>
                    {ACCOUNT_ICONS[a.type] || '🏦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {a.bank && <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">{a.bank}</p>}
                    <p className="font-semibold text-stone-800">{a.name}</p>
                    <p className="text-xs text-stone-400 capitalize">{a.type}</p>
                  </div>
                  <p className="font-bold text-xl text-stone-800">{fmt(a.balance)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onAccountClick(a)}
                    className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-semibold active:scale-95 transition-transform">
                    View transactions
                  </button>
                  <button onClick={() => setEditItem(a)}
                    className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 active:scale-95 transition-transform">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
