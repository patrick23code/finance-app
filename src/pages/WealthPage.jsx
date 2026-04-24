import { useAuth } from '../context/AuthContext'
import { useCollection } from '../hooks/useFirestore'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }
const ACCOUNT_COLORS = { checking: 'bg-blue-100', savings: 'bg-emerald-100', cash: 'bg-yellow-100' }

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function WealthPage({ onNavigate, onAccountClick }) {
  const { user } = useAuth()
  const { data: accounts, loading } = useCollection('accounts', user?.uid)

  const totalWealth = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh bg-[#E8E4DE]">
      <div className="text-stone-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-svh bg-[#E8E4DE] pb-24">
      <div className="max-w-md mx-auto px-4 pt-14">
        <p className="text-stone-500 text-sm mb-1">Net worth</p>
        <h1 className="text-3xl font-bold text-stone-800 tracking-tight mb-6">Wealth</h1>

        {/* Total */}
        <div className="bg-stone-800 rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-stone-400 text-xs font-medium uppercase tracking-wide mb-1">Total balance</p>
          <p className="text-4xl font-bold text-white tracking-tight">{fmt(totalWealth)}</p>
          <p className="text-stone-500 text-xs mt-1">Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
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
              <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer" onClick={() => onAccountClick(a)}>
                <div className="flex items-center gap-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
