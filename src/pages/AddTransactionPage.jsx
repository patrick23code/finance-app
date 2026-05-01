import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  NotebookPen,
  Tag,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { addDocument, updateDocument, useCollection } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'

const ACCOUNT_ICONS = { checking: '🏦', savings: '💰', cash: '💵' }

const EXTRA_EXPENSE_CATEGORIES = [
  { id: 'supercharge', label: 'SuperCharge', emoji: '⚡', color: 'bg-violet-500' },
  { id: 'credit-card-payment', label: 'Credit Card Payment', emoji: '💳', color: 'bg-indigo-500' },
]

const EXTRA_INCOME_CATEGORIES = [
  { id: 'business', label: 'Business', emoji: '💼', color: 'bg-blue-500' },
  { id: 'solar-business', label: 'SolarBusiness', emoji: '☀️', color: 'bg-yellow-400' },
  { id: 'refund', label: 'Refund', emoji: '↩️', color: 'bg-teal-500' },
  { id: 'gift', label: 'Gift', emoji: '🎁', color: 'bg-pink-500' },
  { id: 'other-income', label: 'Other Income', emoji: '📦', color: 'bg-stone-400' },
]

const MOCK_ACCOUNTS = [
  { id: 'mock-chase-debit', name: 'Chase Debit', kind: 'Debit Card', sourceType: 'account', icon: '💳', color: 'bg-indigo-500', mock: true },
  { id: 'mock-apple-card', name: 'Apple Card', kind: 'Credit Card', sourceType: 'card', icon: '', color: 'bg-stone-800', mock: true },
  { id: 'mock-freedom', name: 'Freedom', kind: 'Credit Card', sourceType: 'card', icon: '💳', color: 'bg-blue-500', mock: true },
  { id: 'mock-citi-simplicity', name: 'Citi Simplicity', kind: 'Credit Card', sourceType: 'card', icon: '💳', color: 'bg-cyan-500', mock: true },
  { id: 'mock-citi-double-cash', name: 'Citi Double Cash', kind: 'Credit Card', sourceType: 'card', icon: '💳', color: 'bg-teal-500', mock: true },
  { id: 'mock-bestbuy', name: 'My BestBuy', kind: 'Credit Card', sourceType: 'card', icon: '🛒', color: 'bg-yellow-400', mock: true },
  { id: 'mock-venture-one', name: 'Venture One', kind: 'Credit Card', sourceType: 'card', icon: '💳', color: 'bg-violet-500', mock: true },
  { id: 'mock-paypal', name: 'PayPal', kind: 'Digital Wallet', sourceType: 'account', icon: 'P', color: 'bg-blue-600', mock: true },
  { id: 'mock-cash', name: 'Cash', kind: 'Cash', sourceType: 'account', icon: '💵', color: 'bg-emerald-500', mock: true },
  { id: 'mock-other', name: 'Other', kind: 'Other', sourceType: 'account', icon: '▫', color: 'bg-stone-500', mock: true },
]

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readableDate(dateStr) {
  if (!dateStr) return ''
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function mergeCategories(base, extras) {
  const seen = new Set(base.map(c => c.id))
  return [...base, ...extras.filter(c => !seen.has(c.id))]
}

function newClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeAmountInput(value) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [whole, ...decimalParts] = cleaned.split('.')
  const decimals = decimalParts.join('').slice(0, 2)
  return decimalParts.length ? `${whole}.${decimals}` : whole
}

function findCategoryByTransaction(categories, transaction) {
  if (!transaction) return null
  const categoryId = transaction.categoryId || transaction.category
  return categories.find(category =>
    category.id === categoryId ||
    category.label === transaction.categoryName ||
    category.label === transaction.name
  ) || null
}

function defaultCategoryForType(categories, transactionType, transactions) {
  const recent = transactions.find(transaction => transaction.type === transactionType)
  const recentCategory = findCategoryByTransaction(categories, recent)
  if (recentCategory) return recentCategory

  if (transactionType === 'income') {
    return categories.find(category => category.id === 'solar-business') ||
      categories.find(category => category.id === 'business') ||
      categories.find(category => category.label === 'SolarBusiness') ||
      categories.find(category => category.label === 'Business') ||
      categories[0] ||
      null
  }

  return categories.find(category => category.id === 'coffee') ||
    categories.find(category => category.label === 'Coffee') ||
    categories[0] ||
    null
}

function findAccountByTransaction(accountOptions, transaction) {
  if (!transaction) return null
  const id = transaction.accountId || transaction.sourceId
  const name = transaction.fromAccountName || transaction.cardName
  return accountOptions.find(account => account.id === id) ||
    accountOptions.find(account => account.name === name) ||
    null
}

function defaultFromAccount(accountOptions, transactions) {
  const recent = transactions.find(transaction => transaction.accountId || transaction.sourceId || transaction.fromAccountName || transaction.cardName)
  const recentAccount = findAccountByTransaction(accountOptions, recent)
  if (recentAccount) return recentAccount

  return accountOptions.find(account => /chase debit/i.test(account.name)) ||
    accountOptions.find(account => /expenses 2026/i.test(account.name)) ||
    accountOptions.find(account => /chase/i.test(account.name)) ||
    accountOptions[0] ||
    null
}

function categoryGroup(category, transactionType) {
  if (category.group) return category.group
  if (transactionType === 'income') return 'Income'

  const id = category.id
  const label = category.label.toLowerCase()
  if (['coffee', 'food', 'groceries'].includes(id) || label.includes('food') || label.includes('coffee') || label.includes('grocer')) return 'Food & Dining'
  if (['gas', 'transport'].includes(id) || label.includes('transport') || label.includes('gas')) return 'Transportation'
  if (['rent'].includes(id) || label.includes('rent')) return 'Housing'
  if (['entertainment'].includes(id) || label.includes('entertain')) return 'Entertainment'
  if (['credit-card-payment', 'supercharge'].includes(id) || label.includes('card') || label.includes('fee')) return 'Bank Fees'
  return 'Miscellaneous'
}

function categoryUsageMap(transactions, transactionType) {
  const usage = new Map()
  transactions.filter(transaction => transaction.type === transactionType).forEach(transaction => {
    const id = transaction.categoryId || transaction.category
    if (id) usage.set(id, (usage.get(id) || 0) + 1)
  })
  return usage
}

function accountUsageMap(transactions) {
  const usage = new Map()
  transactions.forEach(transaction => {
    const id = transaction.accountId || transaction.sourceId
    const name = transaction.fromAccountName || transaction.cardName
    if (id) usage.set(id, (usage.get(id) || 0) + 1)
    if (name) usage.set(`name:${name}`, (usage.get(`name:${name}`) || 0) + 1)
  })
  return usage
}

function accountUsage(account, usageByAccount) {
  return (usageByAccount.get(account.id) || 0) + (usageByAccount.get(`name:${account.name}`) || 0)
}

function accountGroup(account) {
  if (account.kind === 'Credit Card') return 'Credit Cards'
  if (account.kind === 'Debit Card') return 'Debit Cards'
  if (account.kind === 'Bank Account') return 'Bank Accounts'
  if (account.kind === 'Cash') return 'Cash'
  if (account.kind === 'Digital Wallet' || account.kind === 'Wallet') return 'Digital Wallets'
  return 'Other'
}

function defaultFrequentAccount(account) {
  return /chase debit|apple card|freedom|paypal/i.test(account.name)
}

function iconForAccountType(type) {
  if (type === 'credit_card' || type === 'debit_card') return '💳'
  if (type === 'bank_account') return '🏦'
  if (type === 'cash') return '💵'
  if (type === 'digital_wallet') return 'P'
  return '▫'
}

export default function AddTransactionPage({ onNavigate }) {
  const { user } = useAuth()
  const { data: debts, loading: debtsLoading } = useCollection('debts', user?.uid)
  const { data: accounts, loading: accountsLoading } = useCollection('accounts', user?.uid)
  const { data: transactions, loading: transactionsLoading } = useCollection('transactions', user?.uid)
  const [saving, setSaving] = useState(false)

  const [transactionType, setTransactionType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [fromAccount, setFromAccount] = useState(null)
  const [toAccount, setToAccount] = useState(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(localDateString())
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
  const [isFromPickerOpen, setIsFromPickerOpen] = useState(false)
  const [isToPickerOpen, setIsToPickerOpen] = useState(false)

  const {
    expenseCategories,
    incomeCategories,
  } = useCategories()

  const categories = useMemo(() => {
    return transactionType === 'income'
      ? mergeCategories(incomeCategories, EXTRA_INCOME_CATEGORIES)
      : mergeCategories(expenseCategories, EXTRA_EXPENSE_CATEGORIES)
  }, [transactionType, expenseCategories, incomeCategories])

  const accountOptions = useMemo(() => {
    const savedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name || account.bank || 'Account',
      kind: account.kind || (account.type === 'cash' ? 'Cash' : account.type === 'savings' ? 'Bank Account' : account.type === 'digital_wallet' ? 'Digital Wallet' : account.type === 'other' ? 'Other' : 'Debit Card'),
      sourceType: 'account',
      icon: account.icon || ACCOUNT_ICONS[account.type] || iconForAccountType(account.type) || '🏦',
      color: account.color || (account.type === 'cash' ? 'bg-emerald-500' : account.type === 'digital_wallet' ? 'bg-blue-600' : 'bg-indigo-500'),
      favorite: !!account.favorite,
      data: account,
    }))

    const savedCards = debts
      .filter(debt => debt.type === 'credit_card')
      .map(card => ({
        id: card.id,
        name: card.name || card.bank || 'Credit Card',
        kind: 'Credit Card',
        sourceType: 'card',
        icon: card.icon || '💳',
        color: card.color || 'bg-violet-500',
        favorite: !!card.favorite,
        last4: card.last4 || null,
        data: card,
      }))

    const saved = [...savedAccounts, ...savedCards]
    return saved.length ? saved : MOCK_ACCOUNTS
  }, [accounts, debts])

  const usageByCategory = useMemo(() => {
    return categoryUsageMap(transactions, transactionType)
  }, [transactions, transactionType])

  const usageByAccount = useMemo(() => {
    return accountUsageMap(transactions)
  }, [transactions])

  useEffect(() => {
    if (!transactionsLoading && !selectedCategory && categories.length) {
      setSelectedCategory(defaultCategoryForType(categories, transactionType, transactions))
    }
  }, [categories, selectedCategory, transactionType, transactions, transactionsLoading])

  useEffect(() => {
    if (!accountsLoading && !debtsLoading && !transactionsLoading && !fromAccount && accountOptions.length) {
      setFromAccount(defaultFromAccount(accountOptions, transactions))
    }
  }, [accountOptions, accountsLoading, debtsLoading, fromAccount, transactions, transactionsLoading])

  const canSave = Number(amount) > 0 && selectedCategory && fromAccount && !saving

  function updateTransactionType(nextType) {
    setTransactionType(nextType)
    setSelectedCategory(null)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const parsedAmount = Number(amount)
      const destination = toAccount || null

      await addDocument('transactions', user.uid, {
        id: newClientId(),
        type: transactionType,
        amount: parsedAmount,
        categoryId: selectedCategory.id,
        categoryName: selectedCategory.label,
        categoryIcon: selectedCategory.emoji,
        categoryColor: selectedCategory.color,
        accountId: fromAccount.id,
        fromAccountName: fromAccount.name,
        fromAccountType: fromAccount.kind,
        toAccountId: destination?.id || null,
        toAccountName: destination?.name || null,
        note: note.trim() || null,
        date,

        name: note.trim() || selectedCategory.label,
        category: selectedCategory.id,
        cardName: fromAccount.name,
        sourceId: fromAccount.mock ? null : fromAccount.id,
        sourceType: fromAccount.mock ? null : fromAccount.sourceType,
        toId: destination && !destination.mock ? destination.id : null,
        toName: destination?.name || null,
      })

      try {
        if (!fromAccount.mock && fromAccount.data) {
          if (fromAccount.sourceType === 'card') {
            const newRemaining = transactionType === 'expense'
              ? (fromAccount.data.remaining || 0) + parsedAmount
              : Math.max(0, (fromAccount.data.remaining || 0) - parsedAmount)
            await updateDocument('debts', fromAccount.id, { remaining: newRemaining })
          } else if (fromAccount.sourceType === 'account') {
            const newBalance = transactionType === 'expense'
              ? Math.max(0, (fromAccount.data.balance || 0) - parsedAmount)
              : (fromAccount.data.balance || 0) + parsedAmount
            await updateDocument('accounts', fromAccount.id, { balance: newBalance })
          }
        }

        if (destination && !destination.mock && destination.sourceType === 'card' && transactionType === 'expense') {
          const newRemaining = Math.max(0, (destination.data?.remaining || 0) - parsedAmount)
          await updateDocument('debts', destination.id, { remaining: newRemaining })
        }
      } catch (error) {
        console.warn('Balance update failed:', error)
      }

      onNavigate('activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh finance-dashboard-bg pb-32 pt-8">
      <div className="max-w-md mx-auto px-4 relative z-10">
        <div className="min-h-[calc(100svh-128px)] rounded-t-[34px] rounded-b-[28px] bg-white/95 backdrop-blur-xl border border-white/70 shadow-[0_24px_70px_rgba(49,28,96,0.18)] overflow-hidden">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-4 pb-3">
            <div className="grid grid-cols-[44px_1fr_44px] items-center">
              <button
                onClick={() => onNavigate('activity')}
                className="w-10 h-10 rounded-full bg-[#F4F0FB] flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X size={20} className="text-[#4B376E]" />
              </button>
              <h1 className="text-center text-[17px] font-black text-[#24143F]">New transaction</h1>
              <div />
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="pt-4 pb-5 text-center">
              <div className="flex items-center justify-center">
                <span className="text-[42px] font-black text-[#24143F] leading-none">$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  placeholder="0"
                  value={amount}
                  onChange={event => setAmount(sanitizeAmountInput(event.target.value))}
                  className="w-[180px] bg-transparent outline-none text-[52px] leading-none font-black text-[#24143F] placeholder:text-[#C8BEDA] text-center tracking-tight"
                />
              </div>

              <div className="mt-5 bg-[#F4F0FB] rounded-full p-1 grid grid-cols-2">
                {['expense', 'income'].map(type => (
                  <button
                    key={type}
                    onClick={() => updateTransactionType(type)}
                    className={`h-11 rounded-full text-sm font-black capitalize transition-all active:scale-[0.98] ${
                      transactionType === type
                        ? 'bg-white text-[#24143F] shadow-[0_8px_22px_rgba(49,28,96,0.12)]'
                        : 'text-[#7F7198]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-[#E9E3F3] shadow-[0_16px_36px_rgba(49,28,96,0.08)] overflow-hidden">
              <FormRow
                icon={<Tag size={19} />}
                label="Category"
                value={selectedCategory?.label || 'Select category'}
                valueMuted={!selectedCategory}
                onClick={() => setIsCategoryPickerOpen(true)}
              />
              <FormRow
                icon={<Wallet size={19} />}
                label="From"
                value={fromAccount?.name || 'Select card/account'}
                valueMuted={!fromAccount}
                required
                onClick={() => setIsFromPickerOpen(true)}
              />
              <FormRow
                icon={<CreditCard size={19} />}
                label="To"
                value={toAccount?.name || 'Optional'}
                valueMuted={!toAccount}
                onClick={() => setIsToPickerOpen(true)}
              />
              <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E9E3F3]">
                <RowIcon><NotebookPen size={19} /></RowIcon>
                <input
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder="Note"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-semibold text-[#24143F] placeholder:text-[#A79CB8]"
                />
              </div>
              <div className="relative flex items-center gap-3 px-4 py-4">
                <RowIcon><CalendarDays size={19} /></RowIcon>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#8F889B]">Date</p>
                  <p className="text-[15px] font-bold text-[#24143F]">{readableDate(date)}</p>
                </div>
                <ChevronRight size={18} className="text-[#B6AACD]" />
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Date"
                />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 bg-gradient-to-t from-white via-white to-white/80 px-5 pt-3 pb-5">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full h-14 rounded-2xl bg-[#180B3D] text-white text-[14px] font-black tracking-wide shadow-[0_16px_32px_rgba(24,11,61,0.22)] active:scale-[0.98] transition-all disabled:bg-[#C8BEDA] disabled:shadow-none disabled:opacity-70"
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>

      <CategoryPickerSheet
        open={isCategoryPickerOpen}
        categories={categories}
        selectedCategory={selectedCategory}
        transactionType={transactionType}
        usageByCategory={usageByCategory}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelect={category => {
          setSelectedCategory(category)
          setIsCategoryPickerOpen(false)
        }}
      />

      <AccountPickerSheet
        open={isFromPickerOpen}
        title="Select From"
        accounts={accountOptions}
        selectedAccount={fromAccount}
        usageByAccount={usageByAccount}
        onClose={() => setIsFromPickerOpen(false)}
        onSelect={account => {
          setFromAccount(account)
          if (toAccount?.id === account.id) setToAccount(null)
          setIsFromPickerOpen(false)
        }}
      />

      <AccountPickerSheet
        open={isToPickerOpen}
        title="Select To"
        accounts={accountOptions}
        selectedAccount={toAccount}
        usageByAccount={usageByAccount}
        includeNone
        onClose={() => setIsToPickerOpen(false)}
        onSelect={account => {
          setToAccount(account)
          setIsToPickerOpen(false)
        }}
      />
    </div>
  )
}

function FormRow({ icon, label, value, valueMuted = false, required = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-[#E9E3F3] active:bg-[#F8F5FC] transition-colors text-left"
    >
      <RowIcon>{icon}</RowIcon>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#8F889B]">
          {label}{required && <span className="text-[#9E76F4]"> *</span>}
        </p>
        <p className={`text-[15px] font-bold truncate ${valueMuted ? 'text-[#A79CB8]' : 'text-[#24143F]'}`}>{value}</p>
      </div>
      <ChevronRight size={18} className="text-[#B6AACD]" />
    </button>
  )
}

function RowIcon({ children }) {
  return (
    <span className="w-10 h-10 rounded-2xl bg-[#F4F0FB] text-[#7F55E9] flex items-center justify-center flex-shrink-0">
      {children}
    </span>
  )
}

function CategoryPickerSheet({
  open,
  categories,
  selectedCategory,
  transactionType,
  usageByCategory,
  onClose,
  onSelect,
}) {
  const sectionedCategories = useMemo(() => {
    const frequent = categories
      .filter(category => (usageByCategory.get(category.id) || 0) > 0)
      .sort((a, b) => (usageByCategory.get(b.id) || 0) - (usageByCategory.get(a.id) || 0))
      .slice(0, 8)

    const frequentIds = new Set(frequent.map(category => category.id))
    const baseSections = transactionType === 'income'
      ? ['Most frequent', 'Income', 'Miscellaneous']
      : ['Most frequent', 'Miscellaneous', 'Bank Fees', 'Entertainment', 'Food & Dining', 'Transportation', 'Housing']
    const extraSections = categories
      .map(category => categoryGroup(category, transactionType))
      .filter(section => !baseSections.includes(section))
    const sectionNames = [...baseSections, ...Array.from(new Set(extraSections))]

    return sectionNames
      .map(section => {
        const items = section === 'Most frequent'
          ? frequent
          : categories.filter(category => !frequentIds.has(category.id) && categoryGroup(category, transactionType) === section)
        return { section, items }
      })
      .filter(group => group.items.length)
  }, [categories, transactionType, usageByCategory])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#180B3D]/70 backdrop-blur-md animate-fade-in">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close categories" />
      <div className="relative w-full max-w-md h-[min(94svh,820px)] rounded-t-[34px] bg-white shadow-[0_-24px_70px_rgba(24,11,61,0.24)] animate-slide-up overflow-hidden">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-4 pb-3">
          <div className="grid grid-cols-[48px_1fr_48px] items-center">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F4F0FB] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X size={18} className="text-[#4B376E]" />
            </button>
            <h2 className="text-center text-[18px] font-black text-[#24143F]">Categories</h2>
            <div />
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-y-auto px-5 pt-2 pb-[max(88px,calc(env(safe-area-inset-bottom)+72px))]">
          {sectionedCategories.map(group => (
            <CategorySection
              key={group.section}
              title={group.section}
              categories={group.items}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
            />
          ))}

          {!sectionedCategories.length && (
            <div className="py-12 text-center text-[#8F889B]">
              <p className="font-bold">No categories found</p>
              <p className="text-sm mt-1">No categories are available for this type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CategorySection({ title, categories, selectedCategory, onSelect }) {
  return (
    <section className="mb-5">
      <div className="mb-3 border-b border-[#E9E3F3] pb-2">
        <h3 className="text-[20px] font-black text-[#24143F] tracking-tight">{title}</h3>
      </div>

      <div className="grid grid-cols-4 gap-x-4 gap-y-3">
        {categories.map(category => (
          <CategoryIconButton
            key={category.id}
            category={category}
            selected={selectedCategory?.id === category.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

function CategoryIconButton({ category, selected, onSelect }) {
  return (
    <div className="relative flex flex-col items-center min-w-0 bg-transparent">
      <button
        onClick={() => onSelect(category)}
        className="flex flex-col items-center gap-1.5 min-w-0 bg-transparent active:scale-95 transition-transform"
      >
        <span className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center text-[24px] border-2 transition-all ${
          selected
            ? `border-[#9E76F4] ${category.color} ring-2 ring-[#9E76F4]/25 ring-offset-2 ring-offset-white`
            : `border-transparent ${category.color}`
        }`}>
          {category.emoji}
        </span>
        <span className={`w-full text-center text-[12px] font-bold leading-[1.1] line-clamp-2 ${selected ? 'text-[#7F55E9]' : 'text-[#4B376E]'}`}>
          {shortCategoryLabel(category.label)}
        </span>
      </button>
    </div>
  )
}

function shortCategoryLabel(label = '') {
  return label
    .replace('Food & Dining', 'Food')
    .replace('Credit Card Payment', 'Card Pay')
    .replace('Entertainment', 'Fun')
    .replace('Transportation', 'Transport')
    .replace('SolarBusiness', 'Solar')
    .replace('Other Income', 'Other')
}

function AccountPickerSheet({
  open,
  title,
  accounts,
  selectedAccount,
  usageByAccount,
  includeNone = false,
  onClose,
  onSelect,
}) {
  const sectionedAccounts = useMemo(() => {
    const frequent = accounts
      .filter(account => accountUsage(account, usageByAccount) > 0 || defaultFrequentAccount(account) || account.favorite)
      .sort((a, b) => {
        const usageDiff = accountUsage(b, usageByAccount) - accountUsage(a, usageByAccount)
        if (usageDiff) return usageDiff
        return Number(!!b.favorite) - Number(!!a.favorite)
      })
      .slice(0, 8)
    const frequentWithNone = includeNone
      ? [{ id: 'none', name: 'None', kind: 'Other', icon: '×', color: 'bg-[#F4F0FB]', none: true }, ...frequent]
      : frequent

    const frequentIds = new Set(frequent.map(account => account.id))
    const sections = ['Most frequent', 'Credit Cards', 'Debit Cards', 'Bank Accounts', 'Cash', 'Digital Wallets', 'Other']

    return sections
      .map(section => {
        const items = section === 'Most frequent'
          ? frequentWithNone
          : accounts.filter(account => !frequentIds.has(account.id) && accountGroup(account) === section)
        return { section, items }
      })
      .filter(group => group.items.length)
  }, [accounts, includeNone, usageByAccount])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#180B3D]/70 backdrop-blur-md animate-fade-in">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close accounts" />
      <div className="relative w-full max-w-md h-[min(94svh,820px)] rounded-t-[34px] bg-white shadow-[0_-24px_70px_rgba(24,11,61,0.24)] animate-slide-up overflow-hidden">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl px-5 pt-4 pb-3">
          <div className="grid grid-cols-[48px_1fr_48px] items-center">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F4F0FB] flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X size={18} className="text-[#4B376E]" />
            </button>
            <h2 className="text-center text-[18px] font-black text-[#24143F]">{title}</h2>
            <div />
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-y-auto px-5 pt-2 pb-[max(88px,calc(env(safe-area-inset-bottom)+72px))]">
          {sectionedAccounts.map(group => (
            <AccountSection
              key={group.section}
              title={group.section}
              accounts={group.items}
              selectedAccount={selectedAccount}
              onSelect={onSelect}
            />
          ))}

          {!sectionedAccounts.length && !includeNone && (
            <div className="py-12 text-center text-[#8F889B]">
              <p className="font-bold">No accounts found</p>
              <p className="text-sm mt-1">No accounts or cards are available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountSection({ title, accounts, selectedAccount, onSelect }) {
  return (
    <section className="mb-5">
      <div className="mb-3 border-b border-[#E9E3F3] pb-2">
        <h3 className="text-[20px] font-black text-[#24143F] tracking-tight">{title}</h3>
      </div>

      <div className="grid grid-cols-4 gap-x-4 gap-y-3">
        {accounts.map(account => (
          <AccountIconButton
            key={account.id}
            account={account}
            selected={account.none ? !selectedAccount : selectedAccount?.id === account.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

function AccountIconButton({ account, selected, onSelect }) {
  return (
    <div className="relative flex flex-col items-center min-w-0 bg-transparent">
      <button
        onClick={() => onSelect(account.none ? null : account)}
        className="flex flex-col items-center gap-1.5 min-w-0 bg-transparent active:scale-95 transition-transform"
      >
        <span className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center text-[23px] font-black border-2 transition-all ${
          selected
            ? `border-[#9E76F4] ${account.color || 'bg-[#F4F0FB]'} ring-2 ring-[#9E76F4]/25 ring-offset-2 ring-offset-white`
            : `border-transparent ${account.color || 'bg-[#F4F0FB]'}`
        }`}>
          {account.icon || (account.sourceType === 'card' ? '💳' : '🏦')}
        </span>
        <span className={`w-full text-center text-[12px] font-bold leading-[1.1] line-clamp-2 ${selected ? 'text-[#7F55E9]' : 'text-[#4B376E]'}`}>
          {account.name}
        </span>
      </button>
    </div>
  )
}
