import { useState } from 'react'
import {
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollection, updateDocument, deleteDocument } from '../hooks/useFirestore'

const ACCOUNT_ICONS = {
  checking: '🏦',
  savings: '💰',
  cash: '💵',
  digital_wallet: '📱',
  other: '▫',
}

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

const CARD_GRADIENTS = Object.fromEntries(CARD_COLORS.map(c => [c.id, c.gradient]))

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

export default function WealthPage({ onNavigate, onAccountClick }) {
  const { user } = useAuth()
  const { data: accounts, loading } = useCollection('accounts', user?.uid)
  const [editItem, setEditItem] = useState(null)

  const availableAccounts = accounts.filter(a => !['credit_card', 'card'].includes(a.type))
  const totalAvailable = availableAccounts.reduce((s, a) => s + (a.balance || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh finance-dashboard-bg">
      <div className="text-[#8F889B]">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32">
      <div className="max-w-md mx-auto px-5 pt-8 relative z-10">
        <TotalBalanceCard total={totalAvailable} />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[22px] font-black text-[#152347] tracking-tight">Bank accounts and cards</h1>
          <button
            onClick={() => onNavigate('add')}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#17307A] shadow-[0_8px_18px_rgba(49,28,96,0.10)] active:scale-95 transition-transform"
            aria-label="Add account"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        {accounts.length === 0 ? (
          <button
            onClick={() => onNavigate('add')}
            className="w-full rounded-[18px] bg-white/86 border border-[#E9E3F3] p-8 text-center shadow-[0_4px_14px_rgba(27,24,46,0.10)] mb-5 active:scale-[0.99] transition-transform"
          >
            <p className="text-[#152347] font-black">No cards yet</p>
            <p className="text-[#7F7198] text-sm mt-1">Tap to add your first account</p>
          </button>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {accounts.map((a, idx) => (
              <WalletCard
                key={a.id}
                account={a}
                index={idx}
                onClick={() => setEditItem(a)}
              />
            ))}
          </div>
        )}

        {editItem && (
          <AccountEditSheet
            account={editItem}
            onClose={() => setEditItem(null)}
          />
        )}
      </div>
    </div>
  )
}

function TotalBalanceCard({ total }) {
  return (
    <div className="relative rounded-[24px] p-6 mb-8 overflow-hidden animate-scale-in bg-gradient-to-br from-[#12D18E] via-[#0BAA6F] to-[#04784F] shadow-[0_22px_44px_rgba(6,120,79,0.28)]">
      <div className="absolute -top-10 -right-3 text-white/12 text-[140px] font-black leading-none select-none pointer-events-none">$</div>
      <div className="absolute -bottom-12 -left-4 text-white/10 text-[120px] font-black leading-none select-none pointer-events-none">$</div>
      <div className="absolute top-5 right-16 text-white/10 text-[54px] font-black leading-none select-none pointer-events-none">$</div>

      <div className="relative">
        <p className="text-white/82 text-[11px] font-black uppercase tracking-[0.22em] mb-3">Total available balance</p>
        <p
          className="text-[46px] font-black text-white leading-none"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '-0.04em',
            textShadow: '2px 0 #7CFFCE, -2px 0 rgba(24,11,61,0.35), 0 10px 26px rgba(0,0,0,0.18)',
          }}
        >
          {fmt(total)}
        </p>
        <p className="text-white/74 text-[12px] font-bold mt-3">Cash, bank accounts, and wallets only.</p>
      </div>
    </div>
  )
}


function WalletCard({ account, index, onClick }) {
  const gradient = CARD_GRADIENTS[account.color] || CARD_GRADIENTS.purple
  const brand = account.bank || account.name || 'Card'
  const digits = account.last4 ? account.last4.padStart(4, '•') : '••••'

  return (
    <button
      onClick={onClick}
      className="relative w-full h-[148px] rounded-[18px] border border-white/40 shadow-[0_10px_24px_rgba(27,24,46,0.16)] overflow-hidden text-left active:scale-[0.985] transition-transform animate-scale-in"
      style={{ animationDelay: `${index * 60}ms`, background: gradient }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.28),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />

      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div>
          <p className="text-[22px] font-black tracking-tight text-white drop-shadow-sm">{brand}</p>
          <p className="text-[12px] font-bold text-white/75 mt-1">{account.name}</p>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[14px] tracking-[0.3em] text-white font-black">•• {digits.slice(-4)}</p>
            <p className="text-[10px] font-bold text-white/75 mt-1 uppercase">{ACCOUNT_ICONS[account.type] || '🏦'} {account.type || 'account'}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-[10px] font-bold uppercase">Balance</p>
            <p className="text-white text-[18px] font-black">{fmt(account.balance || 0)}</p>
          </div>
        </div>
      </div>
    </button>
  )
}


function AccountEditSheet({ account, onClose }) {
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
      <div className="fixed inset-0 bg-black/60 z-[70]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white/95 rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pt-4 pb-20">
          <div className="w-10 h-1 bg-[#D8D0E8] rounded-full mx-auto mb-4" />

          <div className="flex items-center justify-between mb-5">
            <button onClick={onClose} className="text-[#7F7198] font-medium text-[15px]">Cancel</button>
            <h2 className="text-[17px] font-bold text-[#24143F]">Edit account</h2>
            <button onClick={handleSave} disabled={saving || !name}
              className="text-[#9E76F4] font-semibold text-[15px] disabled:text-[#7F7198]">
              Save
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Name</p>
              <input type="text" placeholder="e.g. Chase Debit"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Bank (optional)</p>
              <input type="text" placeholder="e.g. Chase"
                value={bank} onChange={e => setBank(e.target.value)}
                className="w-full text-[15px] font-semibold text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Balance</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-[#7F7198]">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={balance} onChange={e => setBalance(e.target.value)}
                  className="flex-1 text-2xl font-bold text-[#24143F] bg-transparent outline-none placeholder:text-[#4B376E]" />
              </div>
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-1">Last 4 digits</p>
              <input type="text" maxLength="4" placeholder="1234"
                value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, ''))}
                className="w-full text-[15px] font-semibold tracking-widest text-[#24143F] bg-transparent outline-none placeholder:text-[#7F7198]" />
            </div>

            <div className="bg-[#F2EEF8] rounded-2xl px-4 py-4 border border-[#E9E3F3]">
              <p className="text-[10px] font-semibold text-[#8F889B] uppercase tracking-wide mb-3">Card color</p>
              <div className="grid grid-cols-3 gap-2">
                {CARD_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`h-12 rounded-xl active:scale-95 transition-transform ${color === c.id ? 'ring-2 ring-offset-2 ring-[#9E76F4]' : ''}`}
                    style={{ background: c.gradient }}
                  >
                    {color === c.id && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete account
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 flex flex-col gap-2 border border-red-200">
                <p className="text-sm font-semibold text-red-500 text-center">Delete this account?</p>
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
