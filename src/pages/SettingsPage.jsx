import { useMemo, useState } from 'react'
import {
  ChevronRight,
  CreditCard,
  Download,
  Landmark,
  Plus,
  Repeat,
  Settings,
  Tags,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useCollection } from '../hooks/useFirestore'

export default function SettingsPage({ onNavigate, onDebtClick }) {
  const { user } = useAuth()
  const { data: accounts } = useCollection('accounts', user?.uid)
  const { data: debts } = useCollection('debts', user?.uid)
  const { data: transactions } = useCollection('transactions', user?.uid)
  const { data: recurring } = useCollection('recurring', user?.uid)
  const categories = useCategories()
  const [activeSheet, setActiveSheet] = useState(null)

  const exportData = useMemo(() => ({
    accounts,
    debts,
    transactions,
    recurring,
    categories: {
      expense: categories.expenseCategories,
      income: categories.incomeCategories,
    },
    exportedAt: new Date().toISOString(),
  }), [accounts, debts, transactions, recurring, categories.expenseCategories, categories.incomeCategories])

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32">
      <div className="max-w-md mx-auto px-5 pt-8 relative z-10">
        <h1 className="text-[28px] font-black text-[#24143F] tracking-tight mb-6">Settings</h1>

        <section className="mb-6">
          <p className="text-[12px] font-black text-[#8F889B] uppercase tracking-[0.14em] mb-3 px-1">Money Setup</p>
          <div className="bg-white/92 rounded-[22px] border border-[#E9E3F3] shadow-[0_10px_30px_rgba(49,28,96,0.10)] overflow-hidden">
            {[
              { title: 'Add New Account / Card / Debt', desc: 'Open the existing full entry form', icon: Plus, onClick: () => onNavigate('add') },
              { title: 'Cards & Accounts', desc: 'Manage saved cards, wallets, and cash', icon: CreditCard, onClick: () => setActiveSheet('accounts') },
              { title: 'Debts', desc: 'Credit cards, loans, and personal debts', icon: Landmark, onClick: () => setActiveSheet('debts') },
              { title: 'Categories', desc: 'Create, edit, and organize categories', icon: Tags, onClick: () => setActiveSheet('categories') },
              { title: 'Recurring', desc: 'Fixed bills and monthly payments', icon: Repeat, onClick: () => onNavigate('recurring') },
              { title: 'Export Data', desc: 'Download JSON or CSV backups', icon: Download, onClick: () => setActiveSheet('export') },
              { title: 'App Settings', desc: 'Currency, theme, notifications, security', icon: Settings, onClick: () => setActiveSheet('appSettings') },
            ].map((row, idx, arr) => (
              <MenuRow key={row.title} {...row} last={idx === arr.length - 1} />
            ))}
          </div>
        </section>

        {/* Wallet info */}
        <section className="mb-6">
          <p className="text-[12px] font-black text-[#8F889B] uppercase tracking-[0.14em] mb-3 px-1">Overview</p>
          <div className="bg-white/92 rounded-[22px] border border-[#E9E3F3] shadow-[0_10px_30px_rgba(49,28,96,0.10)] overflow-hidden">
            <MenuRow title="Accounts" desc={`${accounts.length} account${accounts.length !== 1 ? 's' : ''} saved`} icon={Wallet} onClick={() => setActiveSheet('accounts')} />
            <MenuRow title="Debts" desc={`${debts.length} debt${debts.length !== 1 ? 's' : ''} tracked`} icon={Landmark} onClick={() => setActiveSheet('debts')} last />
          </div>
        </section>
      </div>

      {activeSheet === 'accounts' && (
        <AccountsManagementSheet
          accounts={accounts}
          onClose={() => setActiveSheet(null)}
          onAdd={() => { setActiveSheet(null); onNavigate('add') }}
        />
      )}
      {activeSheet === 'debts' && (
        <DebtManagementSheet
          debts={debts}
          onClose={() => setActiveSheet(null)}
          onAdd={() => { setActiveSheet(null); onNavigate('add') }}
          onDebtClick={debt => {
            setActiveSheet(null)
            onDebtClick?.(debt)
          }}
        />
      )}
      {activeSheet === 'categories' && (
        <CategoryManagerSheet categories={categories} onClose={() => setActiveSheet(null)} />
      )}
      {activeSheet === 'export' && (
        <ExportDataSheet data={exportData} onClose={() => setActiveSheet(null)} />
      )}
      {activeSheet === 'appSettings' && (
        <AppSettingsSheet onClose={() => setActiveSheet(null)} />
      )}
    </div>
  )
}

function MenuRow({ title, desc, icon: Icon, onClick, last }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-4 flex items-center gap-3 active:bg-[#F7F3FC] transition-colors">
      <span className="w-11 h-11 rounded-full bg-[#F2EEF8] text-[#9E76F4] flex items-center justify-center flex-shrink-0">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className={`flex-1 min-w-0 py-0.5 ${last ? '' : 'border-b border-[#E9E3F3]'}`}>
        <span className="block text-[14px] font-black text-[#24143F]">{title}</span>
        <span className="block text-[12px] font-semibold text-[#8F889B] mt-0.5">{desc}</span>
      </span>
      <ChevronRight size={18} className="text-[#B4A8C8] flex-shrink-0" />
    </button>
  )
}

function Sheet({ title, onClose, children, action }) {
  return (
    <>
      <button className="fixed inset-0 bg-[#180B3D]/55 backdrop-blur-sm z-50" onClick={onClose} aria-label="Close sheet" />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto bg-white rounded-t-[30px] max-h-[88vh] overflow-hidden shadow-[0_-20px_60px_rgba(24,11,61,0.25)]">
          <div className="px-5 pt-4 pb-3 border-b border-[#E9E3F3]">
            <div className="w-10 h-1 bg-[#D8D0E8] rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 items-center">
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#F2EEF8] flex items-center justify-center text-[#4B376E]">
                <X size={18} />
              </button>
              <h2 className="text-center text-[17px] font-black text-[#24143F]">{title}</h2>
              <div className="flex justify-end">{action}</div>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(88vh-86px)] px-5 py-5 pb-28">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

function ManagementSection({ title, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-[19px] font-black text-[#24143F] tracking-tight mb-2">{title}</h3>
      <div className="h-px bg-[#E9E3F3] mb-2" />
      <div className="bg-white rounded-[18px] border border-[#E9E3F3] px-3">
        {children}
      </div>
    </section>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[20px] bg-[#F7F3FC] border border-[#E9E3F3] p-8 text-center">
      <p className="font-black text-[#24143F]">{title}</p>
      <p className="text-sm font-semibold text-[#8F889B] mt-1">{text}</p>
    </div>
  )
}

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵', digital_wallet: '📱', other: '▫' }

function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}

function groupAccounts(accounts) {
  const defs = [
    ['Checking', a => a.type === 'checking'],
    ['Savings', a => a.type === 'savings'],
    ['Cash', a => a.type === 'cash'],
    ['Digital Wallets', a => a.type === 'digital_wallet'],
    ['Other', a => !['checking', 'savings', 'cash', 'digital_wallet'].includes(a.type)],
  ]
  return defs.map(([title, predicate]) => ({ title, items: accounts.filter(predicate) })).filter(g => g.items.length)
}

function AccountsManagementSheet({ accounts, onClose, onAdd }) {
  const groups = groupAccounts(accounts)
  return (
    <Sheet
      title="Cards & Accounts"
      onClose={onClose}
      action={<button onClick={onAdd} className="w-10 h-10 rounded-full bg-[#180B3D] text-white flex items-center justify-center"><Plus size={18} /></button>}
    >
      {groups.map(group => (
        <ManagementSection key={group.title} title={group.title}>
          {group.items.map(account => (
            <div key={account.id} className="w-full py-3 flex items-center gap-3 text-left">
              <span className="w-11 h-11 rounded-full bg-[#F2EEF8] flex items-center justify-center text-[19px]">{ACCOUNT_ICONS[account.type] || '🏦'}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-black text-[#24143F]">{account.name}</span>
                <span className="block text-[12px] font-semibold text-[#8F889B]">{account.bank || account.type || 'Account'} · {fmtMoney(account.balance)}</span>
              </span>
            </div>
          ))}
        </ManagementSection>
      ))}
      {accounts.length === 0 && <EmptyState title="No accounts yet" text="Add your first account or card with the existing entry form." />}
    </Sheet>
  )
}

function DebtManagementSheet({ debts, onClose, onAdd, onDebtClick }) {
  const groups = [
    { title: 'Credit Cards', items: debts.filter(d => d.type === 'credit_card') },
    { title: 'Loans', items: debts.filter(d => d.type === 'loan') },
    { title: 'Personal Debts', items: debts.filter(d => d.type === 'personal') },
  ].filter(g => g.items.length)

  return (
    <Sheet
      title="Debts"
      onClose={onClose}
      action={<button onClick={onAdd} className="w-10 h-10 rounded-full bg-[#180B3D] text-white flex items-center justify-center"><Plus size={18} /></button>}
    >
      {groups.map(group => (
        <ManagementSection key={group.title} title={group.title}>
          {group.items.map(debt => (
            <button key={debt.id} onClick={() => onDebtClick?.(debt)} className="w-full py-3 flex items-center gap-3 text-left">
              <span className="w-11 h-11 rounded-full bg-[#F2EEF8] text-[#9E76F4] flex items-center justify-center">
                {debt.type === 'credit_card' ? <CreditCard size={19} /> : <Landmark size={19} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-black text-[#24143F]">{debt.name}</span>
                <span className="block text-[12px] font-semibold text-[#8F889B]">{debt.bank || debt.person || 'Debt'} · {fmtMoney(debt.remaining)}</span>
              </span>
              <ChevronRight size={17} className="text-[#B4A8C8]" />
            </button>
          ))}
        </ManagementSection>
      ))}
      {debts.length === 0 && <EmptyState title="No debts yet" text="Add a loan, credit card, or personal debt with the existing entry form." />}
    </Sheet>
  )
}

function CategoryManagerSheet({ categories, onClose }) {
  const [type, setType] = useState('expense')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const current = type === 'expense' ? categories.expenseCategories : categories.incomeCategories

  function addCategory() {
    const label = name.trim()
    if (!label) return
    categories.addCustom({
      id: `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || Date.now()}`,
      label,
      emoji: emoji || '✨',
      color: type === 'expense' ? 'bg-violet-500' : 'bg-emerald-500',
    }, type)
    setName('')
    setEmoji('✨')
  }

  return (
    <Sheet title="Categories" onClose={onClose}>
      <div className="bg-[#F7F3FC] rounded-[18px] p-1 flex mb-4">
        {['expense', 'income'].map(option => (
          <button key={option} onClick={() => setType(option)} className={`flex-1 py-2.5 rounded-[14px] text-sm font-black capitalize ${type === option ? 'bg-white text-[#24143F] shadow-sm' : 'text-[#8F889B]'}`}>
            {option}
          </button>
        ))}
      </div>
      <div className="bg-[#F7F3FC] rounded-[18px] p-3 mb-5 border border-[#E9E3F3]">
        <p className="text-[12px] font-black text-[#8F889B] uppercase tracking-[0.12em] mb-3">Create category</p>
        <div className="flex gap-2">
          <input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))} className="w-14 h-12 rounded-[14px] bg-white text-center text-xl outline-none border border-[#E9E3F3]" />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" className="flex-1 h-12 rounded-[14px] bg-white px-3 text-[14px] font-bold text-[#24143F] outline-none border border-[#E9E3F3]" />
          <button onClick={addCategory} className="w-12 h-12 rounded-[14px] bg-[#180B3D] text-white flex items-center justify-center"><Plus size={18} /></button>
        </div>
      </div>
      <ManagementSection title={type === 'expense' ? 'Expense categories' : 'Income categories'}>
        <div className="grid grid-cols-4 gap-x-4 gap-y-4 pt-2">
          {current.map(cat => (
            <div key={`${type}-${cat.id}`} className="text-center min-w-0">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-[22px] text-white ${cat.color || 'bg-violet-500'}`}>
                {cat.emoji}
              </div>
              <p className="text-[11px] font-bold text-[#4B376E] mt-1.5 truncate">{cat.label}</p>
              <button
                onClick={() => categories.isBuiltIn(cat.id) ? categories.hideCategory(cat.id) : categories.deleteCustom(cat.id, type)}
                className="text-[10px] font-bold text-red-400 mt-1"
              >
                {categories.isBuiltIn(cat.id) ? 'Hide' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      </ManagementSection>
    </Sheet>
  )
}

function ExportDataSheet({ data, onClose }) {
  function download(format) {
    const content = format === 'json' ? JSON.stringify(data, null, 2) : toCsv(data)
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-export.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet title="Export Data" onClose={onClose}>
      <div className="rounded-[22px] bg-[#F7F3FC] border border-[#E9E3F3] p-5 mb-4">
        <p className="text-[15px] font-black text-[#24143F]">Your export includes transactions, debts, accounts, categories, and recurring items.</p>
        <p className="text-[12px] font-semibold text-[#8F889B] mt-2">Use JSON for backup, CSV for spreadsheets.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => download('json')} className="rounded-[18px] bg-[#180B3D] text-white py-4 text-sm font-black">JSON</button>
        <button onClick={() => download('csv')} className="rounded-[18px] bg-[#F2EEF8] text-[#24143F] py-4 text-sm font-black">CSV</button>
      </div>
    </Sheet>
  )
}

function AppSettingsSheet({ onClose }) {
  const rows = [
    ['Currency', 'USD'],
    ['Theme', 'Purple gradient'],
    ['Notifications', 'Payment reminders'],
    ['Security / Passcode', 'Not configured'],
    ['Backup / Restore', 'Use export data'],
    ['Reset Data', 'Manual reset only'],
  ]
  return (
    <Sheet title="App Settings" onClose={onClose}>
      <div className="bg-white rounded-[20px] border border-[#E9E3F3] overflow-hidden">
        {rows.map(([title, value], idx) => (
          <div key={title} className={`px-4 py-4 flex items-center justify-between gap-3 ${idx === rows.length - 1 ? '' : 'border-b border-[#E9E3F3]'}`}>
            <span className="text-[14px] font-black text-[#24143F]">{title}</span>
            <span className="text-[12px] font-bold text-[#8F889B] text-right">{value}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

function toCsv(data) {
  const rows = [['section', 'id', 'name', 'type', 'amount', 'date']]
  data.transactions.forEach(item => rows.push(['transactions', item.id, item.name || '', item.type || '', item.amount || '', item.date || '']))
  data.debts.forEach(item => rows.push(['debts', item.id, item.name || '', item.type || '', item.remaining || '', '']))
  data.accounts.forEach(item => rows.push(['accounts', item.id, item.name || '', item.type || '', item.balance || '', '']))
  data.recurring.forEach(item => rows.push(['recurring', item.id, item.name || '', item.category || '', item.amount || '', '']))
  return rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
}
